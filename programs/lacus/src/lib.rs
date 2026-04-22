use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};

declare_id!("Cw6bBLRd661pFrq5WiUjWQQXBikN6bXxCsUrwFGovSbN");

#[program]
pub mod lacus {
    use super::*;

    pub fn initialize_factory(ctx: Context<InitializeFactory>, authority: Pubkey) -> Result<()> {
        let factory = &mut ctx.accounts.factory_state;
        factory.authority = authority;
        factory.bond_count = 0;
        factory.bump = ctx.bumps.factory_state;
        Ok(())
    }

    pub fn issue_bond(ctx: Context<IssueBond>, params: IssueBondParams) -> Result<()> {
        let clock = Clock::get()?;
        
        require!(
            params.maturity_timestamp > clock.unix_timestamp,
            LacusError::InvalidMaturityDate
        );
        require!(params.max_supply > 0, LacusError::InvalidAmount);
        require!(!params.name.is_empty(), LacusError::InvalidAmount);
        require!(!params.symbol.is_empty(), LacusError::InvalidAmount);
        require!(
            params.loan_agreement_hash != [0u8; 32],
            LacusError::InvalidLoanAgreementHash
        );

        let factory = &mut ctx.accounts.factory_state;
        let bond_state = &mut ctx.accounts.bond_state;
        
        bond_state.bond_id = factory.bond_count;
        bond_state.issuer = ctx.accounts.issuer.key();
        bond_state.name = params.name;
        bond_state.symbol = params.symbol;
        bond_state.face_value = params.face_value;
        bond_state.coupon_rate_bps = params.coupon_rate_bps;
        bond_state.maturity_timestamp = params.maturity_timestamp;
        bond_state.max_supply = params.max_supply;
        bond_state.tokens_sold = 0;
        bond_state.total_yield_deposited = 0;
        bond_state.total_principal_deposited = 0;
        bond_state.is_matured = false;
        bond_state.principal_deposited = false;
        bond_state.loan_agreement_hash = params.loan_agreement_hash;
        bond_state.bond_mint = ctx.accounts.bond_mint.key();
        bond_state.usdc_vault = ctx.accounts.bond_yield_vault.key();
        bond_state.bond_token_vault = ctx.accounts.bond_token_vault.key();
        bond_state.bump = ctx.bumps.bond_state;

        factory.bond_count += 1;

        let bond_id_bytes = bond_state.bond_id.to_le_bytes();
        let seeds = &[
            b"bond",
            bond_id_bytes.as_ref(),
            &[bond_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.bond_mint.to_account_info(),
                    to: ctx.accounts.bond_token_vault.to_account_info(),
                    authority: ctx.accounts.bond_state.to_account_info(),
                },
                signer,
            ),
            params.max_supply,
        )?;

        Ok(())
    }

    pub fn buy_bond(ctx: Context<BuyBond>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        if clock.unix_timestamp >= ctx.accounts.bond_state.maturity_timestamp {
            ctx.accounts.bond_state.is_matured = true;
        }
        
        require!(!ctx.accounts.bond_state.is_matured, LacusError::BondAlreadyMatured);
        require!(
            ctx.accounts.bond_state.tokens_sold + amount <= ctx.accounts.bond_state.max_supply,
            LacusError::SupplyExceeded
        );

        let total_cost = ctx.accounts.bond_state.face_value
            .checked_mul(amount)
            .ok_or(LacusError::InvalidAmount)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc_ata.to_account_info(),
                    to: ctx.accounts.issuer_usdc_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            total_cost,
        )?;

        let bond_id_bytes = ctx.accounts.bond_state.bond_id.to_le_bytes();
        let bump = ctx.accounts.bond_state.bump;
        let seeds = &[
            b"bond",
            bond_id_bytes.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bond_token_vault.to_account_info(),
                    to: ctx.accounts.buyer_bond_ata.to_account_info(),
                    authority: ctx.accounts.bond_state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        ctx.accounts.bond_state.tokens_sold += amount;

        Ok(())
    }

    pub fn deposit_yield(ctx: Context<DepositYield>, amount: u64) -> Result<()> {
        require!(amount > 0, LacusError::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.issuer_usdc_ata.to_account_info(),
                    to: ctx.accounts.bond_yield_vault.to_account_info(),
                    authority: ctx.accounts.issuer.to_account_info(),
                },
            ),
            amount,
        )?;

        let bond_state = &mut ctx.accounts.bond_state;
        bond_state.total_yield_deposited += amount;

        Ok(())
    }

    pub fn deposit_principal(ctx: Context<DepositPrincipal>, amount: u64) -> Result<()> {
        require!(amount > 0, LacusError::InvalidAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.issuer_usdc_ata.to_account_info(),
                    to: ctx.accounts.bond_yield_vault.to_account_info(),
                    authority: ctx.accounts.issuer.to_account_info(),
                },
            ),
            amount,
        )?;

        let bond_state = &mut ctx.accounts.bond_state;
        bond_state.total_principal_deposited += amount;
        bond_state.principal_deposited = true;

        Ok(())
    }

    pub fn claim_yield(ctx: Context<ClaimYield>) -> Result<()> {
        let bond_state = &ctx.accounts.bond_state;
        let investor_position = &mut ctx.accounts.investor_position;

        if investor_position.investor == Pubkey::default() {
            investor_position.investor = ctx.accounts.investor.key();
            investor_position.bond_state = bond_state.key();
            investor_position.last_yield_snapshot = 0;
            investor_position.bump = ctx.bumps.investor_position;
        }

        let deposited_since = bond_state.total_yield_deposited
            .checked_sub(investor_position.last_yield_snapshot)
            .ok_or(LacusError::InvalidAmount)?;

        let investor_balance = ctx.accounts.investor_bond_ata.amount;

        let claimable = deposited_since
            .checked_mul(investor_balance)
            .ok_or(LacusError::InvalidAmount)?
            .checked_div(bond_state.max_supply)
            .ok_or(LacusError::InvalidAmount)?;

        require!(claimable > 0, LacusError::NothingToClaim);

        let bond_id_bytes = bond_state.bond_id.to_le_bytes();
        let seeds = &[
            b"bond",
            bond_id_bytes.as_ref(),
            &[bond_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bond_yield_vault.to_account_info(),
                    to: ctx.accounts.investor_usdc_ata.to_account_info(),
                    authority: ctx.accounts.bond_state.to_account_info(),
                },
                signer,
            ),
            claimable,
        )?;

        investor_position.last_yield_snapshot = bond_state.total_yield_deposited;

        Ok(())
    }

    pub fn redeem_bond(ctx: Context<RedeemBond>) -> Result<()> {
        let clock = Clock::get()?;
        let bond_state = &mut ctx.accounts.bond_state;

        if clock.unix_timestamp >= bond_state.maturity_timestamp {
            bond_state.is_matured = true;
        }

        require!(bond_state.is_matured, LacusError::BondNotMatured);
        require!(
            bond_state.principal_deposited,
            LacusError::PrincipalNotDeposited
        );

        let investor_balance = ctx.accounts.investor_bond_ata.amount;
        require!(investor_balance > 0, LacusError::InvalidAmount);

        let principal_amount = bond_state.total_principal_deposited
            .checked_mul(investor_balance)
            .ok_or(LacusError::InvalidAmount)?
            .checked_div(bond_state.max_supply)
            .ok_or(LacusError::InvalidAmount)?;

        let bond_id_bytes = bond_state.bond_id.to_le_bytes();
        let seeds = &[
            b"bond",
            bond_id_bytes.as_ref(),
            &[bond_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.bond_mint.to_account_info(),
                    from: ctx.accounts.investor_bond_ata.to_account_info(),
                    authority: ctx.accounts.investor.to_account_info(),
                },
            ),
            investor_balance,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bond_yield_vault.to_account_info(),
                    to: ctx.accounts.investor_usdc_ata.to_account_info(),
                    authority: ctx.accounts.bond_state.to_account_info(),
                },
                signer,
            ),
            principal_amount,
        )?;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IssueBondParams {
    pub name: String,
    pub symbol: String,
    pub face_value: u64,
    pub coupon_rate_bps: u16,
    pub maturity_timestamp: i64,
    pub max_supply: u64,
    pub loan_agreement_hash: [u8; 32],
}

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
pub struct IssueBond<'info> {
    #[account(
        mut,
        seeds = [b"factory"],
        bump = factory_state.bump
    )]
    pub factory_state: Account<'info, FactoryState>,
    #[account(
        init,
        payer = issuer,
        space = 8 + BondState::INIT_SPACE,
        seeds = [b"bond", factory_state.bond_count.to_le_bytes().as_ref()],
        bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(
        init,
        payer = issuer,
        mint::decimals = 0,
        mint::authority = bond_state,
        seeds = [b"mint", bond_state.key().as_ref()],
        bump
    )]
    pub bond_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = issuer,
        associated_token::mint = usdc_mint,
        associated_token::authority = bond_state
    )]
    pub bond_yield_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = issuer,
        associated_token::mint = bond_mint,
        associated_token::authority = bond_state
    )]
    pub bond_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyBond<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = bond_mint,
        associated_token::authority = buyer
    )]
    pub buyer_bond_ata: Account<'info, TokenAccount>,
    /// CHECK: validated by constraint
    #[account(
        mut,
        constraint = issuer_usdc_ata.owner == bond_state.issuer
    )]
    pub issuer_usdc_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bond_token_vault.key() == bond_state.bond_token_vault
    )]
    pub bond_token_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bond_mint.key() == bond_state.bond_mint
    )]
    pub bond_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer_usdc_ata: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
        constraint = bond_yield_vault.key() == bond_state.usdc_vault
    )]
    pub bond_yield_vault: Account<'info, TokenAccount>,
    pub issuer: Signer<'info>,
    #[account(mut)]
    pub issuer_usdc_ata: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
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
        constraint = bond_yield_vault.key() == bond_state.usdc_vault
    )]
    pub bond_yield_vault: Account<'info, TokenAccount>,
    pub issuer: Signer<'info>,
    #[account(mut)]
    pub issuer_usdc_ata: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
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
        init_if_needed,
        payer = investor,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [b"position", bond_state.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investor_position: Account<'info, InvestorPosition>,
    #[account(mut)]
    pub investor: Signer<'info>,
    pub investor_bond_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub investor_usdc_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bond_yield_vault.key() == bond_state.usdc_vault
    )]
    pub bond_yield_vault: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemBond<'info> {
    #[account(
        mut,
        seeds = [b"bond", bond_state.bond_id.to_le_bytes().as_ref()],
        bump = bond_state.bump
    )]
    pub bond_state: Account<'info, BondState>,
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut)]
    pub investor_bond_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub investor_usdc_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bond_yield_vault.key() == bond_state.usdc_vault
    )]
    pub bond_yield_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = bond_mint.key() == bond_state.bond_mint
    )]
    pub bond_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

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
    pub maturity_timestamp: i64,
    pub max_supply: u64,
    pub tokens_sold: u64,
    pub total_yield_deposited: u64,
    pub total_principal_deposited: u64,
    pub is_matured: bool,
    pub principal_deposited: bool,
    pub loan_agreement_hash: [u8; 32],
    pub bond_mint: Pubkey,
    pub usdc_vault: Pubkey,
    pub bond_token_vault: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct InvestorPosition {
    pub investor: Pubkey,
    pub bond_state: Pubkey,
    pub last_yield_snapshot: u64,
    pub bump: u8,
}

#[error_code]
pub enum LacusError {
    #[msg("Not authorized to perform this action")]
    NotAuthorized,
    #[msg("Bond has already matured")]
    BondAlreadyMatured,
    #[msg("Bond has not matured yet")]
    BondNotMatured,
    #[msg("Principal has not been deposited")]
    PrincipalNotDeposited,
    #[msg("Bond supply exceeded")]
    SupplyExceeded,
    #[msg("Invalid loan agreement hash")]
    InvalidLoanAgreementHash,
    #[msg("Invalid maturity date")]
    InvalidMaturityDate,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Invalid amount")]
    InvalidAmount,
}
