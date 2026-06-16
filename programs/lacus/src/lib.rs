use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("9NYAKSppmqJgBPmrKq5zqudEsURvbjSm6Tb4BxCZMS8S");

// ---------------------------------------------------------------------------
// Lacus — P2P tokenize tahvil / kredi protokolu (guvenli yeniden yazim)
//
// Tasarim ozeti (denetim bulgularina karsi):
//  * Escrow modeli: lender SOL'u escrow PDA'sinda tutulur; funding_goal'a
//    ulasilirsa issuer ceker (%1 platform fee), ulasilmazsa lender refund alir.
//  * Getiri ve anapara AYRI vault PDA'larinda tutulur (commingling yok).
//  * Token yok / non-transferable: muhasebe InvestorPosition kaydi uzerinden
//    yapilir; tokens balansina hic bakilmaz -> getiri cift-talebi imkansiz.
//  * Tum para/oran hesaplari checked_* veya u128 ara hesap ile yapilir.
//  * Itfa ancak anapara TAM fonlandiginda acilir (kismi-fon ile token yakma yok).
//
//  NOT: Issuer'in geri odememe (default) riski on-chain cozulemez; bu risk
//  loan_agreement_hash ile temsil edilen yasal katmana aittir. Bu kontrat
//  yalnizca para hareketinin MEKANIGINI guvene alir.
// ---------------------------------------------------------------------------

const PLATFORM_FEE_BPS: u64 = 100; // %1
const SECONDARY_FEE_BPS: u64 = 25; // %0.25 (ikincil piyasa islem ucreti)
const BPS_DENOMINATOR: u64 = 10_000;
// Issuer funding_goal'a ulasildigi halde escrow'u cekmezse, lender'lar
// bu sure sonunda paralarini geri alabilir (no-show issuer korumasi).
const ABANDON_GRACE: i64 = 7 * 24 * 60 * 60; // 7 gun
// Vade + bu sure sonra issuer artik (dust + sahipsiz kalan) bakiyeyi tahsil edebilir.
const RESIDUAL_GRACE: i64 = 180 * 24 * 60 * 60; // 180 gun

#[inline]
fn mul_div(a: u64, b: u64, denom: u64) -> Result<u64> {
    let result = (a as u128)
        .checked_mul(b as u128)
        .ok_or(LacusError::MathOverflow)?
        .checked_div(denom as u128)
        .ok_or(LacusError::MathOverflow)?;
    u64::try_from(result).map_err(|_| error!(LacusError::MathOverflow))
}

/// İkincil listeleme pay matematigi (saf fonksiyon -> test edilebilir).
/// `units` adet birim listelenirken pozisyondan tasinacak paylari hesaplar:
///  - contribution_share: orantili anapara (par) payi
///  - claimed_share: orantili daha once claim edilmis kupon
///  - entitled_for_units: bu birimlere bugune kadar dusen toplam hak
///  - settle: saticiya simdi odenecek birikmis (claim edilmemis) kupon
/// Invariant: claim_yield monotonik oldugundan claimed_share <= entitled_for_units,
/// yani settle asla underflow etmez.
#[inline]
fn list_split(
    contribution: u64,
    yield_claimed: u64,
    units: u64,
    prev_units: u64,
    total_yield: u64,
    tokens_sold: u64,
) -> Result<(u64, u64, u64, u64)> {
    let contribution_share = mul_div(contribution, units, prev_units)?;
    let claimed_share = mul_div(yield_claimed, units, prev_units)?;
    let entitled_for_units = mul_div(total_yield, units, tokens_sold)?;
    let settle = entitled_for_units
        .checked_sub(claimed_share)
        .ok_or(LacusError::MathOverflow)?;
    Ok((contribution_share, claimed_share, entitled_for_units, settle))
}

#[program]
pub mod lacus {
    use super::*;

    /// Factory'yi baslatir. authority = cagiran (signer). `init` kullanildigi
    /// icin iki kez cagrilamaz (re-init / ele gecirme yok). Authority sonradan
    /// set_authority ile degistirilebilir.
    pub fn initialize_factory(ctx: Context<InitializeFactory>) -> Result<()> {
        let factory = &mut ctx.accounts.factory_state;
        factory.authority = ctx.accounts.authority.key();
        factory.bond_count = 0;
        factory.bump = ctx.bumps.factory_state;
        Ok(())
    }

    /// Platform authority'sini (ve dolayisiyla fee alicisini) degistirir.
    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        require!(new_authority != Pubkey::default(), LacusError::InvalidParams);
        ctx.accounts.factory_state.authority = new_authority;
        Ok(())
    }

    /// Yeni bir tahvil ihrac eder. Henuz para hareketi yok; sadece sale
    /// penceresi acilir. Token mint edilmez.
    pub fn issue_bond(ctx: Context<IssueBond>, params: IssueBondParams) -> Result<()> {
        let clock = Clock::get()?;

        require!(!params.name.is_empty() && params.name.len() <= 64, LacusError::InvalidParams);
        require!(!params.symbol.is_empty() && params.symbol.len() <= 8, LacusError::InvalidParams);
        require!(params.face_value > 0, LacusError::InvalidParams);
        require!(params.max_supply > 0, LacusError::InvalidParams);
        require!(params.funding_goal > 0, LacusError::InvalidParams);

        // funding_goal, maksimum toplanabilecek tutari asamaz.
        let max_raise = (params.max_supply as u128)
            .checked_mul(params.face_value as u128)
            .ok_or(LacusError::MathOverflow)?;
        require!((params.funding_goal as u128) <= max_raise, LacusError::InvalidParams);

        require!(params.sale_deadline > clock.unix_timestamp, LacusError::InvalidParams);
        require!(
            params.maturity_timestamp > params.sale_deadline,
            LacusError::InvalidParams
        );
        require!(
            params.loan_agreement_hash != [0u8; 32],
            LacusError::InvalidLoanAgreementHash
        );

        let factory = &mut ctx.accounts.factory_state;
        let bond_id = factory.bond_count;
        factory.bond_count = factory.bond_count.checked_add(1).ok_or(LacusError::MathOverflow)?;

        let bond = &mut ctx.accounts.bond_state;
        bond.bond_id = bond_id;
        bond.issuer = ctx.accounts.issuer.key();
        bond.name = params.name;
        bond.symbol = params.symbol;
        bond.face_value = params.face_value;
        bond.coupon_rate_bps = params.coupon_rate_bps;
        bond.sale_deadline = params.sale_deadline;
        bond.maturity_timestamp = params.maturity_timestamp;
        bond.funding_goal = params.funding_goal;
        bond.max_supply = params.max_supply;
        bond.tokens_sold = 0;
        bond.total_raised = 0;
        bond.total_yield_deposited = 0;
        bond.total_principal_deposited = 0;
        bond.funded = false;
        bond.principal_funded = false;
        bond.loan_agreement_hash = params.loan_agreement_hash;
        bond.bump = ctx.bumps.bond_state;

        Ok(())
    }

    /// Lender, `units` adet birim satin alir. Odenen SOL escrow vault'una gider
    /// (issuer'a DEGIL). Pozisyon kaydi olusturulur/guncellenir.
    pub fn buy_bond(ctx: Context<BuyBond>, units: u64) -> Result<()> {
        let clock = Clock::get()?;
        require!(units > 0, LacusError::InvalidParams);

        {
            let bond = &ctx.accounts.bond_state;
            require!(!bond.funded, LacusError::FundingClosed);
            require!(clock.unix_timestamp < bond.sale_deadline, LacusError::FundingClosed);
        }

        let face_value = ctx.accounts.bond_state.face_value;
        let max_supply = ctx.accounts.bond_state.max_supply;
        let new_sold = ctx
            .accounts
            .bond_state
            .tokens_sold
            .checked_add(units)
            .ok_or(LacusError::MathOverflow)?;
        require!(new_sold <= max_supply, LacusError::SupplyExceeded);

        let cost = (units as u128)
            .checked_mul(face_value as u128)
            .ok_or(LacusError::MathOverflow)?;
        let cost = u64::try_from(cost).map_err(|_| error!(LacusError::MathOverflow))?;

        // Lender -> escrow vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            ),
            cost,
        )?;

        // Pozisyon
        let position = &mut ctx.accounts.investor_position;
        if position.investor == Pubkey::default() {
            position.investor = ctx.accounts.buyer.key();
            position.bond_state = ctx.accounts.bond_state.key();
            position.yield_claimed = 0;
            position.redeemed = false;
            position.refunded = false;
            position.bump = ctx.bumps.investor_position;
        }
        require!(!position.refunded, LacusError::AlreadyRefunded);
        position.units = position.units.checked_add(units).ok_or(LacusError::MathOverflow)?;
        position.contribution = position
            .contribution
            .checked_add(cost)
            .ok_or(LacusError::MathOverflow)?;

        let bond = &mut ctx.accounts.bond_state;
        bond.tokens_sold = new_sold;
        bond.total_raised = bond.total_raised.checked_add(cost).ok_or(LacusError::MathOverflow)?;

        Ok(())
    }

    /// Funding basariliysa (goal'a ulasildi + pencere kapandi) issuer escrow'u
    /// ceker. Toplanan tutarin %1'i platform authority'sine, kalani issuer'a.
    pub fn withdraw_escrow(ctx: Context<WithdrawEscrow>) -> Result<()> {
        let clock = Clock::get()?;
        let (bond_id, escrow_bump, total, to_issuer, fee);
        {
            let bond = &ctx.accounts.bond_state;
            require!(!bond.funded, LacusError::AlreadyFunded);
            require!(bond.total_raised >= bond.funding_goal, LacusError::GoalNotReached);
            require!(
                clock.unix_timestamp >= bond.sale_deadline || bond.tokens_sold >= bond.max_supply,
                LacusError::FundingOpen
            );
            bond_id = bond.bond_id;
            total = bond.total_raised;
            fee = mul_div(total, PLATFORM_FEE_BPS, BPS_DENOMINATOR)?;
            to_issuer = total.checked_sub(fee).ok_or(LacusError::MathOverflow)?;
        }
        escrow_bump = ctx.bumps.escrow_vault;

        let id_bytes = bond_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"escrow", id_bytes.as_ref(), &[escrow_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        if fee > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow_vault.to_account_info(),
                        to: ctx.accounts.fee_recipient.to_account_info(),
                    },
                    signer_seeds,
                ),
                fee,
            )?;
        }
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.issuer.to_account_info(),
                },
                signer_seeds,
            ),
            to_issuer,
        )?;

        ctx.accounts.bond_state.funded = true;
        Ok(())
    }

    /// Funding basarisizsa (vade gecti + goal'a ulasilmadi) ya da issuer
    /// ABANDON_GRACE icinde escrow'u cekmediyse, lender katkisini geri alir.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let clock = Clock::get()?;
        let (bond_id, escrow_bump, amount, units);
        {
            let bond = &ctx.accounts.bond_state;
            require!(!bond.funded, LacusError::AlreadyFunded);
            let failed =
                clock.unix_timestamp >= bond.sale_deadline && bond.total_raised < bond.funding_goal;
            let abandoned = clock.unix_timestamp >= bond.sale_deadline + ABANDON_GRACE;
            require!(failed || abandoned, LacusError::RefundNotAvailable);
            bond_id = bond.bond_id;

            let position = &ctx.accounts.investor_position;
            require!(!position.refunded, LacusError::AlreadyRefunded);
            require!(position.units > 0, LacusError::NothingToRefund);
            amount = position.contribution;
            units = position.units;
        }
        escrow_bump = ctx.bumps.escrow_vault;

        let id_bytes = bond_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"escrow", id_bytes.as_ref(), &[escrow_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.investor.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let position = &mut ctx.accounts.investor_position;
        position.refunded = true;
        position.units = 0;
        position.contribution = 0;

        let bond = &mut ctx.accounts.bond_state;
        bond.total_raised = bond.total_raised.checked_sub(amount).ok_or(LacusError::MathOverflow)?;
        bond.tokens_sold = bond.tokens_sold.checked_sub(units).ok_or(LacusError::MathOverflow)?;

        Ok(())
    }

    /// Issuer kupon (getiri) yatirir -> yield vault. Yalnizca funding sonrasi.
    pub fn deposit_yield(ctx: Context<DepositYield>, amount: u64) -> Result<()> {
        require!(amount > 0, LacusError::InvalidParams);
        require!(ctx.accounts.bond_state.funded, LacusError::NotFunded);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.issuer.to_account_info(),
                    to: ctx.accounts.yield_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let bond = &mut ctx.accounts.bond_state;
        bond.total_yield_deposited = bond
            .total_yield_deposited
            .checked_add(amount)
            .ok_or(LacusError::MathOverflow)?;
        Ok(())
    }

    /// Issuer anapara yatirir -> principal vault. Toplam >= toplanan tutara
    /// ulasinca itfa acilir (principal_funded). Yalnizca funding sonrasi.
    pub fn deposit_principal(ctx: Context<DepositPrincipal>, amount: u64) -> Result<()> {
        require!(amount > 0, LacusError::InvalidParams);
        require!(ctx.accounts.bond_state.funded, LacusError::NotFunded);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.issuer.to_account_info(),
                    to: ctx.accounts.principal_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let bond = &mut ctx.accounts.bond_state;
        bond.total_principal_deposited = bond
            .total_principal_deposited
            .checked_add(amount)
            .ok_or(LacusError::MathOverflow)?;
        if bond.total_principal_deposited >= bond.total_raised {
            bond.principal_funded = true;
        }
        Ok(())
    }

    /// Lender, hak ettigi kupon payini talep eder. Pay, pozisyondaki SABIT
    /// birim sayisina gore hesaplanir (token balansina bakilmaz). yield_claimed
    /// monotonik artar -> cift talep imkansiz, anaparaya dokunmaz (ayri vault).
    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        let (bond_id, yield_bump, claimable, entitled);
        {
            let bond = &ctx.accounts.bond_state;
            require!(bond.funded, LacusError::NotFunded);
            require!(bond.tokens_sold > 0, LacusError::NothingToClaim);

            let position = &ctx.accounts.investor_position;
            require!(!position.refunded, LacusError::AlreadyRefunded);
            require!(position.units > 0, LacusError::NothingToClaim);

            entitled = mul_div(bond.total_yield_deposited, position.units, bond.tokens_sold)?;
            claimable = entitled
                .checked_sub(position.yield_claimed)
                .ok_or(LacusError::MathOverflow)?;
            require!(claimable > 0, LacusError::NothingToClaim);
            bond_id = bond.bond_id;
        }
        yield_bump = ctx.bumps.yield_vault;

        let id_bytes = bond_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"yield", id_bytes.as_ref(), &[yield_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.yield_vault.to_account_info(),
                    to: ctx.accounts.investor.to_account_info(),
                },
                signer_seeds,
            ),
            claimable,
        )?;

        ctx.accounts.investor_position.yield_claimed = entitled;
        Ok(())
    }

    /// Vade sonrasi ve anapara TAM fonlandiysa lender anaparasini (par = katki)
    /// principal vault'tan geri alir. Her pozisyon yalnizca bir kez itfa edilir.
    pub fn redeem_bond(ctx: Context<RedeemBond>) -> Result<()> {
        let clock = Clock::get()?;
        let (bond_id, principal_bump, amount);
        {
            let bond = &ctx.accounts.bond_state;
            require!(clock.unix_timestamp >= bond.maturity_timestamp, LacusError::NotMatured);
            require!(bond.principal_funded, LacusError::PrincipalNotFunded);

            let position = &ctx.accounts.investor_position;
            require!(!position.refunded, LacusError::AlreadyRefunded);
            require!(!position.redeemed, LacusError::AlreadyRedeemed);
            require!(position.units > 0, LacusError::NothingToRedeem);
            amount = position.contribution;
            bond_id = bond.bond_id;
        }
        principal_bump = ctx.bumps.principal_vault;

        let id_bytes = bond_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"principal", id_bytes.as_ref(), &[principal_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.principal_vault.to_account_info(),
                    to: ctx.accounts.investor.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        ctx.accounts.investor_position.redeemed = true;
        Ok(())
    }

    /// Vade + RESIDUAL_GRACE sonrasi issuer, yield/principal vault'larinda kalan
    /// (yuvarlamadan artan dust + zamaninda itfa edilmemis sahipsiz) bakiyeyi
    /// tahsil eder. Escrow vault'a DOKUNMAZ (orasi lender'larindir).
    pub fn reclaim_residual(ctx: Context<ReclaimResidual>) -> Result<()> {
        let clock = Clock::get()?;
        let (bond_id, yield_bump, principal_bump);
        {
            let bond = &ctx.accounts.bond_state;
            require!(
                clock.unix_timestamp >= bond.maturity_timestamp + RESIDUAL_GRACE,
                LacusError::TooEarly
            );
            bond_id = bond.bond_id;
        }
        yield_bump = ctx.bumps.yield_vault;
        principal_bump = ctx.bumps.principal_vault;

        let id_bytes = bond_id.to_le_bytes();

        let y = ctx.accounts.yield_vault.lamports();
        if y > 0 {
            let seeds: &[&[u8]] = &[b"yield", id_bytes.as_ref(), &[yield_bump]];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.yield_vault.to_account_info(),
                        to: ctx.accounts.issuer.to_account_info(),
                    },
                    signer_seeds,
                ),
                y,
            )?;
        }

        let p = ctx.accounts.principal_vault.lamports();
        if p > 0 {
            let seeds: &[&[u8]] = &[b"principal", id_bytes.as_ref(), &[principal_bump]];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.principal_vault.to_account_info(),
                        to: ctx.accounts.issuer.to_account_info(),
                    },
                    signer_seeds,
                ),
                p,
            )?;
        }
        Ok(())
    }

    // -- Secondary market (P2P): listing + atomik alim -----------------------
    // Birimler SPL token DEGIL; non-transferable muhasebe korunur. Devir yalnizca
    // bu talimatlar uzerinden olur: list_units birimleri Listing'e kilitler,
    // buy_listing atomik olarak SOL'u satici/protokole, birimleri aliciya tasir.

    /// Holder, pozisyonundaki `units` birimi `price_per_unit` (lamport/birim)
    /// fiyatla listeler. Birimler (oranli contribution + accrued yield ile)
    /// Listing'e kilitlenir; saticinin o birimlere dusen birikmis kuponu o anda
    /// saticiya odenir ki alici "temiz" baslasin. Trade penceresi: funded..maturity.
    pub fn list_units(ctx: Context<ListUnits>, units: u64, price_per_unit: u64) -> Result<()> {
        let clock = Clock::get()?;
        require!(units > 0 && price_per_unit > 0, LacusError::InvalidParams);

        let (bond_id, total_yield, tokens_sold, yield_bump);
        {
            let bond = &ctx.accounts.bond_state;
            require!(bond.funded, LacusError::NotFunded);
            require!(clock.unix_timestamp < bond.maturity_timestamp, LacusError::NotTradeable);
            bond_id = bond.bond_id;
            total_yield = bond.total_yield_deposited;
            tokens_sold = bond.tokens_sold;
        }
        yield_bump = ctx.bumps.yield_vault;
        require!(tokens_sold > 0, LacusError::NotTradeable);

        let prev_units = ctx.accounts.investor_position.units;
        // Pay matematigi (saf fonksiyon, ayrica unit-test edilir).
        let (contribution_share, claimed_share, entitled_for_units, settle) = {
            let position = &ctx.accounts.investor_position;
            require!(!position.refunded && !position.redeemed, LacusError::NotTradeable);
            require!(prev_units >= units, LacusError::InsufficientUnits);
            list_split(position.contribution, position.yield_claimed, units, prev_units, total_yield, tokens_sold)?
        };

        if settle > 0 {
            let id_bytes = bond_id.to_le_bytes();
            let seeds: &[&[u8]] = &[b"yield", id_bytes.as_ref(), &[yield_bump]];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.yield_vault.to_account_info(),
                        to: ctx.accounts.seller.to_account_info(),
                    },
                    signer_seeds,
                ),
                settle,
            )?;
        }

        // Pozisyondan birimleri (ve paylari) cikar.
        let position = &mut ctx.accounts.investor_position;
        position.units = prev_units.checked_sub(units).ok_or(LacusError::MathOverflow)?;
        position.contribution = position
            .contribution
            .checked_sub(contribution_share)
            .ok_or(LacusError::MathOverflow)?;
        position.yield_claimed = position
            .yield_claimed
            .checked_sub(claimed_share)
            .ok_or(LacusError::MathOverflow)?;

        // Listing'i doldur. yield_claimed_share = entitled_for_units (guncel seviye)
        // => alici devraldiginda yalnizca listeleme sonrasi yatan kuponu kazanir.
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.bond_state = ctx.accounts.bond_state.key();
        listing.units = units;
        listing.price_per_unit = price_per_unit;
        listing.contribution_share = contribution_share;
        listing.yield_claimed_share = entitled_for_units;
        listing.active = true;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// Satici ilani iptal eder: birimler (paylariyla) pozisyona geri doner,
    /// Listing hesabi kapatilir (rent satiriya iade).
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing_units = ctx.accounts.listing.units;
        let contribution_share = ctx.accounts.listing.contribution_share;
        let claimed_share = ctx.accounts.listing.yield_claimed_share;

        let position = &mut ctx.accounts.investor_position;
        require!(!position.refunded && !position.redeemed, LacusError::NotTradeable);
        position.units = position.units.checked_add(listing_units).ok_or(LacusError::MathOverflow)?;
        position.contribution = position
            .contribution
            .checked_add(contribution_share)
            .ok_or(LacusError::MathOverflow)?;
        position.yield_claimed = position
            .yield_claimed
            .checked_add(claimed_share)
            .ok_or(LacusError::MathOverflow)?;
        Ok(())
    }

    /// Alici, ilanin tamamini satin alir. SOL atomik olarak satiriya (fiyat) ve
    /// protokole (%0.25 ucret) gider; birimler (par + accrued seviyesiyle) alicinin
    /// pozisyonuna gecer. tokens_sold DEGISMEZ => kupon matematigi bozulmaz.
    pub fn buy_listing(ctx: Context<BuyListing>) -> Result<()> {
        let clock = Clock::get()?;
        {
            let bond = &ctx.accounts.bond_state;
            require!(bond.funded, LacusError::NotFunded);
            require!(clock.unix_timestamp < bond.maturity_timestamp, LacusError::NotTradeable);
        }
        let units = ctx.accounts.listing.units;
        let price_per_unit = ctx.accounts.listing.price_per_unit;
        let contribution_share = ctx.accounts.listing.contribution_share;
        let claimed_share = ctx.accounts.listing.yield_claimed_share;
        require!(ctx.accounts.buyer.key() != ctx.accounts.seller.key(), LacusError::SelfTrade);

        let total = (units as u128)
            .checked_mul(price_per_unit as u128)
            .ok_or(LacusError::MathOverflow)?;
        let total = u64::try_from(total).map_err(|_| error!(LacusError::MathOverflow))?;
        let fee = mul_div(total, SECONDARY_FEE_BPS, BPS_DENOMINATOR)?;

        // Alici -> satici (fiyat)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            total,
        )?;
        // Alici -> protokol (ucret)
        if fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.fee_recipient.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Birimleri alicinin pozisyonuna tasi.
        let position = &mut ctx.accounts.buyer_position;
        if position.investor == Pubkey::default() {
            position.investor = ctx.accounts.buyer.key();
            position.bond_state = ctx.accounts.bond_state.key();
            position.units = 0;
            position.contribution = 0;
            position.yield_claimed = 0;
            position.redeemed = false;
            position.refunded = false;
            position.bump = ctx.bumps.buyer_position;
        }
        require!(!position.refunded && !position.redeemed, LacusError::NotTradeable);
        position.units = position.units.checked_add(units).ok_or(LacusError::MathOverflow)?;
        position.contribution = position
            .contribution
            .checked_add(contribution_share)
            .ok_or(LacusError::MathOverflow)?;
        position.yield_claimed = position
            .yield_claimed
            .checked_add(claimed_share)
            .ok_or(LacusError::MathOverflow)?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IssueBondParams {
    pub name: String,
    pub symbol: String,
    pub face_value: u64,
    pub coupon_rate_bps: u16,
    pub sale_deadline: i64,
    pub maturity_timestamp: i64,
    pub funding_goal: u64,
    pub max_supply: u64,
    pub loan_agreement_hash: [u8; 32],
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeFactory<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + FactoryState::INIT_SPACE,
        seeds = [b"factory"],
        bump
    )]
    pub factory_state: Account<'info, FactoryState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(
        mut,
        seeds = [b"factory"],
        bump = factory_state.bump,
        constraint = factory_state.authority == authority.key() @ LacusError::NotAuthorized
    )]
    pub factory_state: Account<'info, FactoryState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct IssueBond<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory_state.bump)]
    pub factory_state: Account<'info, FactoryState>,
    #[account(
        init,
        payer = issuer,
        space = 8 + BondState::INIT_SPACE,
        seeds = [b"bond", factory_state.bond_count.to_le_bytes().as_ref()],
        bump
    )]
    pub bond_state: Account<'info, BondState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyBond<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"escrow", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [b"position", bond_state.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawEscrow<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(seeds = [b"factory"], bump = factory_state.bump)]
    pub factory_state: Account<'info, FactoryState>,
    #[account(
        mut,
        seeds = [b"escrow", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_vault: SystemAccount<'info>,
    #[account(
        mut,
        constraint = issuer.key() == bond_state.issuer @ LacusError::NotAuthorized
    )]
    pub issuer: Signer<'info>,
    /// CHECK: platform fee alicisi; factory authority'sine kilitli.
    #[account(
        mut,
        constraint = fee_recipient.key() == factory_state.authority @ LacusError::NotAuthorized
    )]
    pub fee_recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"escrow", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", bond_state.key().as_ref(), investor.key().as_ref()],
        bump = investor_position.bump,
        constraint = investor_position.investor == investor.key() @ LacusError::NotAuthorized
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositYield<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump,
        constraint = bond_state.issuer == issuer.key() @ LacusError::NotAuthorized
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"yield", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub yield_vault: SystemAccount<'info>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPrincipal<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump,
        constraint = bond_state.issuer == issuer.key() @ LacusError::NotAuthorized
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"principal", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub principal_vault: SystemAccount<'info>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimYield<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"yield", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub yield_vault: SystemAccount<'info>,
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", bond_state.key().as_ref(), investor.key().as_ref()],
        bump = investor_position.bump,
        constraint = investor_position.investor == investor.key() @ LacusError::NotAuthorized
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemBond<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"principal", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub principal_vault: SystemAccount<'info>,
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", bond_state.key().as_ref(), investor.key().as_ref()],
        bump = investor_position.bump,
        constraint = investor_position.investor == investor.key() @ LacusError::NotAuthorized
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReclaimResidual<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump,
        constraint = bond_state.issuer == issuer.key() @ LacusError::NotAuthorized
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"yield", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub yield_vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [b"principal", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub principal_vault: SystemAccount<'info>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListUnits<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"yield", bond_state.bond_id.to_le_bytes().as_ref()],
        bump
    )]
    pub yield_vault: SystemAccount<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"position", bond_state.key().as_ref(), seller.key().as_ref()],
        bump = investor_position.bump,
        constraint = investor_position.investor == seller.key() @ LacusError::NotAuthorized
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", bond_state.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        mut,
        seeds = [b"position", bond_state.key().as_ref(), seller.key().as_ref()],
        bump = investor_position.bump,
        constraint = investor_position.investor == seller.key() @ LacusError::NotAuthorized
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    #[account(
        mut,
        close = seller,
        seeds = [b"listing", bond_state.key().as_ref(), seller.key().as_ref()],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ LacusError::NotAuthorized
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(seeds = [b"factory"], bump = factory_state.bump)]
    pub factory_state: Account<'info, FactoryState>,
    #[account(
        mut,
        close = seller,
        seeds = [b"listing", bond_state.key().as_ref(), seller.key().as_ref()],
        bump = listing.bump,
        constraint = listing.bond_state == bond_state.key() @ LacusError::InvalidParams
    )]
    pub listing: Account<'info, Listing>,
    /// CHECK: satici; SOL + listing rent alicisi, listing.seller'a kilitli.
    #[account(
        mut,
        constraint = seller.key() == listing.seller @ LacusError::NotAuthorized
    )]
    pub seller: UncheckedAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [b"position", bond_state.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_position: Account<'info, InvestorPosition>,
    /// CHECK: platform fee alicisi; factory authority'sine kilitli.
    #[account(
        mut,
        constraint = fee_recipient.key() == factory_state.authority @ LacusError::NotAuthorized
    )]
    pub fee_recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct FactoryState {
    pub authority: Pubkey,
    pub bond_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BondState {
    pub bond_id: u64,
    pub issuer: Pubkey,
    #[max_len(64)]
    pub name: String,
    #[max_len(8)]
    pub symbol: String,
    pub face_value: u64,
    pub coupon_rate_bps: u16,
    pub sale_deadline: i64,
    pub maturity_timestamp: i64,
    pub funding_goal: u64,
    pub max_supply: u64,
    pub tokens_sold: u64,
    pub total_raised: u64,
    pub total_yield_deposited: u64,
    pub total_principal_deposited: u64,
    pub funded: bool,
    pub principal_funded: bool,
    pub loan_agreement_hash: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct InvestorPosition {
    pub investor: Pubkey,
    pub bond_state: Pubkey,
    pub units: u64,
    pub contribution: u64,
    pub yield_claimed: u64,
    pub redeemed: bool,
    pub refunded: bool,
    pub bump: u8,
}

/// Ikincil piyasa ilani. Birimler ilan suresince burada kilitli; satici basina
/// tek aktif ilan (PDA seed seller'a bagli). buy/cancel'da hesap kapatilir.
#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub seller: Pubkey,
    pub bond_state: Pubkey,
    pub units: u64,
    pub price_per_unit: u64,
    pub contribution_share: u64,
    pub yield_claimed_share: u64,
    pub active: bool,
    pub bump: u8,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum LacusError {
    #[msg("Not authorized to perform this action")]
    NotAuthorized,
    #[msg("Invalid parameters")]
    InvalidParams,
    #[msg("Invalid loan agreement hash")]
    InvalidLoanAgreementHash,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Bond supply exceeded")]
    SupplyExceeded,
    #[msg("Funding window is closed")]
    FundingClosed,
    #[msg("Funding window is still open")]
    FundingOpen,
    #[msg("Funding goal not reached")]
    GoalNotReached,
    #[msg("Bond is already funded")]
    AlreadyFunded,
    #[msg("Bond is not funded yet")]
    NotFunded,
    #[msg("Refund is not available")]
    RefundNotAvailable,
    #[msg("Position already refunded")]
    AlreadyRefunded,
    #[msg("Nothing to refund")]
    NothingToRefund,
    #[msg("Principal not fully funded")]
    PrincipalNotFunded,
    #[msg("Bond has not matured yet")]
    NotMatured,
    #[msg("Position already redeemed")]
    AlreadyRedeemed,
    #[msg("Nothing to redeem")]
    NothingToRedeem,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Too early")]
    TooEarly,
    #[msg("Bond is not tradeable in its current state")]
    NotTradeable,
    #[msg("Not enough units in position")]
    InsufficientUnits,
    #[msg("Buyer and seller cannot be the same")]
    SelfTrade,
}

// ---------------------------------------------------------------------------
// Tests (saf matematik) — `cargo test -p lacus`
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mul_div_basic() {
        assert_eq!(mul_div(1000, 40, 100).unwrap(), 400);
        assert_eq!(mul_div(4, 40, 100).unwrap(), 1); // floor
        assert_eq!(mul_div(8000, 40, 1000).unwrap(), 320);
    }

    #[test]
    fn list_split_partial() {
        // 100 birimlik pozisyonun 40'i listeleniyor. contribution 1000, daha once
        // 4 lamport kupon claim edilmis. total_yield 8000, tokens_sold 1000.
        let (cs, cls, ent, settle) = list_split(1000, 4, 40, 100, 8000, 1000).unwrap();
        assert_eq!(cs, 400); // par payi
        assert_eq!(cls, 1); // 4*40/100 floor
        assert_eq!(ent, 320); // 8000*40/1000
        assert_eq!(settle, 319); // ent - claimed_share
        // konservasyon: paylar pozisyondaki degerleri asmaz, settle birikmis hakki asmaz
        assert!(cs <= 1000 && cls <= 4 && settle <= ent);
    }

    #[test]
    fn list_split_full_position_moves_everything() {
        // Tum pozisyon (100/100) listeleniyor; kupon tam claim edilmis (settle=0).
        let (cs, cls, ent, settle) = list_split(1000, 320, 100, 100, 3200, 1000).unwrap();
        assert_eq!(cs, 1000);
        assert_eq!(cls, 320);
        assert_eq!(ent, 320);
        assert_eq!(settle, 0);
    }

    #[test]
    fn list_split_settle_never_underflows() {
        // claim invariant'i altinda claimed_share <= entitled_for_units olmali.
        let (_, cls, ent, settle) = list_split(500, 100, 50, 200, 4000, 2000).unwrap();
        assert!(cls <= ent);
        assert_eq!(settle, ent - cls);
    }

    #[test]
    fn secondary_fee_quarter_percent() {
        // %0.25 ucret: 100 SOL'luk islemde 0.25 SOL.
        let total: u64 = 100_000_000_000;
        assert_eq!(mul_div(total, SECONDARY_FEE_BPS, BPS_DENOMINATOR).unwrap(), 250_000_000);
    }
}
