# Lacus Copy Deck v1

Tarih: 12 Jun 2026. Kaynak: design/concept.html rev 5 + yeni anlatı.

## Kurallar

- Ton: sakin, kendinden emin, jargonu açıklayan. Şiirsel kripto dili yok.
- Em-dash (—) hiçbir metinde kullanılmaz. Nokta, virgül, iki nokta, orta nokta (·) serbest.
- Anlatı çapaları: gerçek taraflar, gerçek sözleşmeler; kod icra eder; non-custodial; spekülasyon değil kredi.
- Terminoloji: anlatı metinlerinde "borrower / lender", market UI ve tablolarda "issuer / investor".
- Mekanizma kalıbı: "a loan agreement between two parties, executed on Solana."
- Kapsam: sadece bond. Başka enstrümanlar yalnızca "more instruments soon" imasıyla geçer.
- İhraç permissionless: review/onay dili hiçbir yerde geçmez.

## Durum etiketleri

- `[AYNI]` concept rev 5 ile aynı, onayına sunuluyor
- `[DEGISTI]` concept'teki metin değişti
- `[YENI]` concept'te olmayan yeni metin (boş durumlar, toast'lar, modal'lar)

İnceleme: satırın başındaki ID ile yorum yaz (ör. "L-03 şöyle olsun: ...").

---

# G · Site geneli

| ID | Yer | Metin | Durum |
|---|---|---|---|
| G-01 | Masthead sol | Peer-to-peer credit, executed on Solana | [DEGISTI] |
| G-02 | Masthead sağ | {date} · Slot {slot} · Devnet | [AYNI] |
| G-03 | Nav linkleri | Launchpad · Primary · Secondary · Dashboard · Manage · About · Whitepaper | [AYNI] |
| G-04 | Devnet rozeti | DEVNET | [AYNI] |
| G-05 | Cüzdan butonu (bağlı değil) | Connect wallet | [AYNI] |
| G-06 | Cüzdan butonu (bağlı) | {7xKp…3Fqm} · Disconnect | [YENI] |
| G-07 | Footer tagline | Real borrowers, real contracts, executed on Solana. Lacus never holds your funds. | [DEGISTI] |
| G-08 | Footer kolonları | Markets: Launchpad / Primary / Secondary · Account: Dashboard / Manage / Issue a bond · Resources: About / Whitepaper / Pitch deck / GitHub | [AYNI] |
| G-09 | Kolofon | SET IN SPECTRAL & IBM PLEX MONO · RECORDS ON SOLANA DEVNET · PROGRAM Lacus11…3xQv · EST. 2025 | [AYNI] |
| G-10 | Footer legal | Lacus is experimental software running on Solana devnet. Bonds shown here are test instruments with no monetary value. Nothing on this site is investment advice. Lacus is non-custodial software: funds move wallet to wallet through program-owned escrow. | [DEGISTI] |

## G · Genel toast ve hata mesajları [YENI]

| ID | Durum | Metin |
|---|---|---|
| G-20 | Tx gönderildi | Transaction sent. Waiting for confirmation… |
| G-21 | Tx onaylandı | Confirmed on-chain. · View transaction ↗ |
| G-22 | Tx başarısız | Transaction failed. No funds moved. · Details |
| G-23 | İmza reddedildi | Signature declined in wallet. |
| G-24 | Yanlış ağ | Switch your wallet to Solana devnet to continue. |
| G-25 | Yetersiz USDC | Not enough USDC. This order needs {$985.97}, your balance is {$120.00}. |
| G-26 | RPC/ağ hatası | Could not reach the network. Your funds are untouched. Try again. |
| G-27 | Veri yüklenemedi | Could not load on-chain data. Retry |

---

# L · Landing

| ID | Yer | Metin | Durum |
|---|---|---|---|
| L-01 | Kicker | Credit, not speculation · Solana | [DEGISTI] |
| L-02 | H1 | Crypto that does what banks do. | [DEGISTI] |
| L-03 | Lede | Lacus turns a loan between two parties into a contract that executes itself on Solana. Companies borrow, lenders earn coupons, and nobody holds the money in between. Not even us. | [DEGISTI] |
| L-04 | CTA'lar | Explore bonds · Read the whitepaper | [AYNI] |
| L-05 | Sertifika metinleri | No. 0001 / 5,000 · SERIES 2025-A · CORPORATE BOND · SENIOR UNSECURED · ATLAS27 · Atlas Lojistik A.Ş., İzmir · $100.00 · FACE VALUE, PAYABLE IN USDC · COUPON 11.50% · SEMI-ANNUAL · DUE 15 MAR 2027 | [DEGISTI: virgüller] |
| L-06 | Sertifika koçanı | ✂ ······· · COUPON № 3 · $5.75 · 15 SEP 2026 · CLAIM IN USDC ↗ | [DEGISTI: ayraçlar] |
| L-07 | İstatistik etiketleri | Total face value · Active bonds · Coupons paid on time¹ · Interest distributed | [AYNI] |
| L-08 | Dipnot 1 | ¹ Counted per holder per payment date, across all issues since protocol launch. A late payment would show here, permanently. | [DEGISTI: em-dash kalktı] |
| L-09 | §1–3 bölüm başlığı | How it works · Three clauses, no fine print | [AYNI] |
| L-10 | §1 başlık | § 1 · AGREE / A borrower signs a loan agreement | [DEGISTI] |
| L-11 | §1 gövde | A company sets the amount, the coupon, and the maturity. The agreement is locked in a program account. Neither side can quietly amend it. | [DEGISTI] |
| L-12 | §1 fine print | Terms hash: 4f2a…9c1e | [AYNI] |
| L-13 | §2 başlık | § 2 · FUND / Lenders fund it, peer to peer | [DEGISTI] |
| L-14 | §2 gövde | Each unit is $100.00 of the loan, paid in USDC. Money moves from your wallet into program-owned escrow. Lacus never touches it. | [DEGISTI] |
| L-15 | §2 fine print | Escrow: program-owned, auditable | [AYNI] |
| L-16 | §3 başlık | § 3 · EXECUTE / The contract executes itself | [DEGISTI] |
| L-17 | §3 gövde | Coupons flow from borrower to lender on fixed dates, principal at maturity. There is no bank in the middle. Late is visible. Missing is undeniable. | [DEGISTI] |
| L-18 | §3 fine print | Record to date: 128 / 128 on time | [AYNI] |
| L-19 | §4 başlık | Current offering · Open for subscription until 28 Jun 2026 · All offerings → | [AYNI] |
| L-20 | Term sheet etiketleri | Face value / Issue size / Units / Price / Yield to maturity / Coupon / Frequency / Settlement / Maturity / Next payment / Subscribed | [AYNI] |
| L-21 | Term sheet foot | MINT {addr} · ESCROW {addr} · ISSUER {addr} · STRUCTURE: BILATERAL LOAN AGREEMENT · VERIFY ON EXPLORER ↗ | [DEGISTI: structure satırı eklendi] |
| L-22 | Buy butonu | Buy units | [AYNI] |
| L-23 | İhraççı bloğu başlıkları | About the issuer · Key figures | [AYNI] |
| L-24 | Key figures "prior issue" | ATLAS25: repaid in full, 4/4 on time | [DEGISTI: em-dash kalktı] |
| L-25 | §5 başlık | Markets · Live issues at a glance · Primary market → | [AYNI] |
| L-26 | §5 altı, coming soon | CORPORATE BONDS TODAY · MORE INSTRUMENTS SOON | [YENI] |
| L-27 | §6 başlık | Payment record · Every coupon, on the record | [AYNI] |
| L-28 | Grafik başlığı | Interest distributed · cumulative since launch · USDC | [AYNI] |
| L-29 | Yeşil bant cümlesi | No banker vouches for anyone here. The record vouches for itself. | [DEGISTI] |
| L-30 | Ödeme logu durumu | ✓ ON TIME | [AYNI] |
| L-31 | Log altı link | View the full record on-chain ↗ | [AYNI] |

---

# LA · Launchpad

| ID | Yer | Metin | Durum |
|---|---|---|---|
| LA-01 | Kicker / H1 | Launchpad / New and upcoming issues. | [AYNI] |
| LA-02 | Lede | Offerings open for subscription. Funds stay in program escrow until a raise fills. If it does not fill, lenders are refunded automatically. | [DEGISTI] |
| LA-03 | Bölüm başlıkları | NOW · Open for subscription / NEXT · Scheduled · Announced, not yet open | [AYNI] |
| LA-04 | Kart durumları | ● NEW ISSUE / ● OPEN · 84% SOLD | [AYNI] |
| LA-05 | Butonlar | Buy units · Preview terms | [AYNI] |
| LA-06 | Boş durum (açık ihraç yok) | No offerings are open right now. New issues appear here the moment a borrower publishes one. | [YENI] |
| LA-07 | Boş durum (scheduled yok) | Nothing scheduled yet. | [YENI] |
| LA-08 | CTA bandı başlık | Borrow without the gatekeepers. | [DEGISTI] |
| LA-09 | CTA bandı gövde | No advisors, no underwriting syndicate, no six-month process. Draft a term sheet and raise from lenders who can verify every promise you make. | [DEGISTI] |
| LA-10 | CTA butonu | Issue a bond | [AYNI] |

---

# P · Primary

| ID | Yer | Metin | Durum |
|---|---|---|---|
| P-01 | Kicker / H1 | Primary market / Subscribe to live issues. | [AYNI] |
| P-02 | Lede | Lend directly to the borrower at the offering price. No underwriter sets the terms. Your money sits in program escrow until close, not with us. | [DEGISTI] |
| P-03 | Filtreler | All · Open · Upcoming · Matured | [AYNI] |
| P-04 | Arama placeholder | Search by symbol or issuer… | [AYNI] |
| P-05 | Tablo başlıkları | No. / Bond / Coupon / Maturity / Price / YTM² / Size / Subscription | [AYNI] |
| P-06 | Durum damgaları | 84% SOLD · SOLD OUT · NEW ISSUE | [AYNI] |
| P-07 | Dipnot 2 | ² Yield to maturity at the current price, annualized. Prices are quoted per $100.00 of face value and settle in USDC. | [AYNI] |
| P-08 | Boş durum (filtre) | No bonds match this filter. | [YENI] |
| P-09 | Boş durum (arama) | Nothing found for "{query}". | [YENI] |

---

# S · Secondary

| ID | Yer | Metin | Durum |
|---|---|---|---|
| S-01 | Kicker / H1 | Secondary market / Trade before maturity. | [AYNI] |
| S-02 | Lede | Sell your side of the agreement before maturity, or buy into one that is already live. The market sets the price. The contract handles accrued interest. | [DEGISTI] |
| S-03 | Tablo başlıkları | Bond / Last / 24h / Bid / Ask / Volume · 24h | [AYNI] |
| S-04 | Tablo dipnotu | Quotes are per $100.00 of face value. Accrued interest is settled automatically at trade time. | [AYNI] |
| S-05 | Ticket sekmeleri | BUY · SELL | [AYNI] |
| S-06 | Ticket satırları | Bond / Ask price / Units / Subtotal / Fee · 0.25% / Total | [AYNI] |
| S-07 | Ticket butonu | Review order | [AYNI] |
| S-08 | Ticket alt yazısı | SETTLES IN USDC · ACCRUED INTEREST INCLUDED | [AYNI] |
| S-09 | Boş durum (likidite yok) | No quotes for this bond yet. Place the first order. | [YENI] |
| S-10 | Toast (emir verildi) | Order submitted. | [YENI] |
| S-11 | Toast (emir gerçekleşti) | Trade settled: {10} units of {ATLAS27} at {$98.65}. | [YENI] |

---

# D · Dashboard

| ID | Yer | Metin | Durum |
|---|---|---|---|
| D-01 | Kicker | Dashboard · Lender view | [DEGISTI] |
| D-02 | H1 | Your account, as a statement. | [AYNI] |
| D-03 | Meta satırı | Account {addr} · Statement date {date} · Settlement USDC | [AYNI] |
| D-04 | Kart etiketleri | Portfolio value / Claimable coupons / Next coupon | [AYNI] |
| D-05 | Claim butonu | Claim all | [AYNI] |
| D-06 | Statement başlığı | Statement of holdings | [AYNI] |
| D-07 | Tablo başlıkları | Bond / Units / Avg. cost / Price / Value / P&L · toplam satırı: Total | [AYNI] |
| D-08 | Alt bölümler | Upcoming payments · Recent activity | [AYNI] |
| D-09 | Aktivite satır kalıpları | Coupon paid · {NOVA26} / Bought {15} · {NOVA26} / Coupon claimed · {VEGA28} | [DEGISTI: em-dash yerine ·] |
| D-10 | Boş durum (cüzdan yok) | Connect a wallet to see your statement. | [YENI] |
| D-11 | Boş durum (pozisyon yok) | No bonds yet. Browse the primary market to make your first loan. · Explore bonds | [YENI] |
| D-12 | Toast (claim başarılı) | Coupons claimed: {$184.12} USDC is in your wallet. | [YENI] |
| D-13 | Boş durum (claim edilecek yok) | Nothing to claim right now. Your next coupon is {ATLAS27 · 15 Sep 2026}. | [YENI] |

---

# M · Manage

| ID | Yer | Metin | Durum |
|---|---|---|---|
| M-01 | Kicker | Manage · Borrower view | [DEGISTI] |
| M-02 | H1 | Your obligations, in plain sight. | [AYNI] |
| M-03 | Lede | Your payment record is your credit rating. Fund coupons on time and every future lender sees it before they subscribe. | [DEGISTI] |
| M-04 | Meta satırı | Issuer {name} · Authority {addr} | [AYNI] |
| M-05 | Kart etiketleri | Outstanding face value / Next coupon due / Escrow · subscription | [AYNI] |
| M-06 | Kart butonu | Deposit USDC | [AYNI] |
| M-07 | Tablo başlıkları | Bond / Status / Sold / Outstanding / Next obligation / Record | [AYNI] |
| M-08 | Record damgası | 2/2 ON TIME · 4/4 ON TIME | [AYNI] |
| M-09 | Alt bölümler | Obligation schedule · Payments made | [AYNI] |
| M-10 | Boş durum (ihraç yok) | You have not issued a bond yet. Draft your first term sheet. · Issue a bond | [YENI] |
| M-11 | Toast (kupon fonlandı) | Coupon funded. {$28,750.00} is locked for the {15 Sep 2026} payment. | [YENI] |
| M-12 | Uyarı (yaklaşan kupon, fonsuz) | Coupon due in {12} days and not yet funded. Late payments are recorded permanently. | [YENI] |
| M-13 | CTA bandı | Raise your next round of debt. / Your on-time record is portable. It follows you to the next raise. / Issue a new bond | [DEGISTI] |

---

# I · Issue (Manage / Issue)

| ID | Yer | Metin | Durum |
|---|---|---|---|
| I-01 | Crumb / Kicker | MANAGE / ISSUE · Form D-1 · New issue | [AYNI] |
| I-02 | H1 | Draft your term sheet. | [AYNI] |
| I-03 | Lede | This is a loan agreement between you and your lenders. Set the terms below. The contract does the collecting, and Lacus never touches the funds. | [DEGISTI] |
| I-04 | Form etiketleri | Issuer name / Symbol / Series / Face value · USDC / Units / Coupon · % p.a. / Frequency / Maturity / Subscription closes / Use of proceeds | [AYNI] |
| I-05 | Use of proceeds yardım metni | Shown verbatim on the term sheet. Lenders read this. | [DEGISTI] |
| I-06 | Ana buton | Sign and publish | [DEGISTI: permissionless] |
| I-07 | Buton yanı not | Issuance is permissionless. Your offering goes live the moment you sign, and the terms lock permanently. | [DEGISTI: review satırı kalktı] |
| I-08 | Önizleme notu | Live preview. The certificate updates as you type. | [AYNI] |
| I-09 | Draft damgası | DRAFT | [AYNI] |
| I-10 | Doğrulama hataları | Symbol is taken. / Coupon must be between 0.01% and 50.00%. / Maturity must be after the subscription close. / Face value and units set your total raise: {$600,000.00}. | [YENI] |
| I-11 | Onay modali | Publish ATLAS28? · You are committing to {4} coupon payments of {$33,000.00} and {$600,000.00} principal at maturity. These terms cannot be changed after you sign. · Sign in wallet / Go back | [YENI] |
| I-12 | Toast (yayınlandı) | Published. {ATLAS28} is live on the launchpad. | [YENI] |

---

# B · Bond detayı

| ID | Yer | Metin | Durum |
|---|---|---|---|
| B-01 | Crumb | MARKETS / ATLAS27 | [AYNI] |
| B-02 | Kicker / H1 | Series 2025-A · Senior unsecured · ● OPEN / ATLAS27, Atlas Lojistik A.Ş. | [DEGISTI: virgül] |
| B-03 | Fiyat şeridi | Price / 24h / Yield to maturity / Coupon / Maturity | [AYNI] |
| B-04 | Terms listesi | Face value / Issue size / Coupon / Day count / Settlement / Subscription closes / Structure: bilateral loan agreement, peer to peer | [DEGISTI: structure satırı eklendi] |
| B-05 | Kupon takvimi başlıkları | Date / Type / Per unit / Total / Status | [AYNI] |
| B-06 | Takvim durumları | ✓ PAID · tx ↗ / SCHEDULED / AT MATURITY | [AYNI] |
| B-07 | On-chain satırları | Bond mint / Escrow / Issuer authority / Terms hash · EXPLORER ↗ · VERIFY ↗ | [AYNI] |
| B-08 | Ticket sekmeleri | SUBSCRIBE · SELL | [AYNI] |
| B-09 | Ticket satırları | Offering price / Units / Subtotal / Protocol fee · 0.20% / Total / You'll receive / Annual interest | [AYNI] |
| B-10 | Ticket butonu | Review subscription | [AYNI] |
| B-11 | Ticket alt yazısı | FUNDS IN PROGRAM ESCROW UNTIL CLOSE · LACUS NEVER HOLDS THEM | [DEGISTI] |
| B-12 | Onay modali | Review your subscription · You are lending {$985.97} to {Atlas Lojistik A.Ş.} under the terms above. Funds stay in program escrow until {28 Jun 2026}. If the offering does not fill, you are refunded automatically. · Sign in wallet / Go back | [YENI] |
| B-13 | Toast (abonelik) | Subscribed. {10} units of {ATLAS27} are in your wallet. | [YENI] |
| B-14 | Toast (iade) | Offering did not fill. Your {$985.97} was returned to your wallet. | [YENI] |

---

# A · About

| ID | Yer | Metin | Durum |
|---|---|---|---|
| A-01 | Kicker / H1 | About / The part of finance crypto skipped. | [DEGISTI] |
| A-02 | Paragraf 1 | Strip a bank down to its essentials and the job is simple: bind real parties to real contracts, then make sure those contracts execute. Loans, schedules, payments. Everything else is overhead on that one function. | [DEGISTI] |
| A-03 | Paragraf 2 | Crypto built exchanges, derivatives, and a thousand ways to bet. It never built the function itself. A decade in, most of the ecosystem still runs on speculation, and that keeps it fragile. | [DEGISTI] |
| A-04 | Paragraf 3 | Lacus rebuilds that function as software. A bond here is a loan agreement between two parties. The terms live in a program account that neither side can change. Payments execute on Solana, wallet to wallet, in USDC. The protocol is non-custodial: we provide the paper and the rails, never the bank account. | [DEGISTI] |
| A-05 | Paragraf 4 | Today that means corporate bonds. The goal is a real credit layer for the network: startup debt, traditional companies, one day even mortgages, sitting next to tokenized treasuries and stocks in a single portfolio. Real cash flows are how this ecosystem grows up. | [DEGISTI] |
| A-06 | Principles başlık | Principles | [AYNI] |
| A-07 | İlke 1 | Non-custodial, always / Funds move wallet to wallet through program-owned escrow. Lacus has no account to freeze and no till to raid. | [DEGISTI] |
| A-08 | İlke 2 | The contract is the product / Terms lock at issuance and execute on schedule. Not by goodwill, by code. | [DEGISTI] |
| A-09 | İlke 3 | Real economy only / Every instrument is a real obligation of a real party. No tokens for the sake of tokens. | [DEGISTI] |
| A-10 | Adresler başlığı | Protocol addresses · Verify everything | [AYNI] |
| A-11 | Adres satırları | Program / USDC mint · devnet / Source code | [AYNI] |

---

# W · Whitepaper

| ID | Yer | Metin | Durum |
|---|---|---|---|
| W-01 | Kicker / H1 | Whitepaper · v1.0 · June 2026 / Lacus: a tokenized bond protocol. | [AYNI] |
| W-02 | İçindekiler | 1 Abstract · 2 Architecture · 3 Agreement lifecycle · 4 Escrow & settlement · 5 Risk disclosures · 6 Roadmap · 7 Regulatory posture | [DEGISTI: 3 yeniden adlandı, 7 eklendi] |
| W-03 | Abstract | Lacus is a non-custodial protocol that turns bilateral loan agreements into self-executing instruments on Solana. Terms are immutable program state. Subscriptions sit in program-owned escrow. Coupons and principal settle wallet to wallet in USDC. The aim is a credit layer with a public, portable record of who borrowed, who paid, and when. | [DEGISTI] |
| W-04 | §2 Architecture | Each bond is a factory-created account triple: a terms account, immutable after issuance; an SPL token mint representing units of face value; and an escrow vault owned by the program. No upgrade authority can modify live agreements; the program's own upgrade path is timelocked and announced on-chain. | [DEGISTI: em-dash kalktı] |
| W-05 | §3 Agreement lifecycle | An agreement moves through four states: draft, open, active, settled. Issuance is permissionless: an offering goes live when the borrower signs it. Subscription is atomic, USDC in and units out, and refunds in full if the offering fails to fill by its close date. Once active, the schedule is enforced by permissionless crank: anyone can trigger a due payment from the borrower's funding account. | [DEGISTI: review state kalktı] |
| W-06 | §4 Escrow & settlement | Subscription proceeds never touch the borrower's wallet until close. Coupons settle pro-rata to token holders at the payment date snapshot. Secondary trades settle with accrued interest computed on a 30/360 day count, so a seller is paid for the days they held. | [AYNI] |
| W-07 | §5 Risk disclosures | Lacus removes opacity, not credit risk. A borrower can still default. The protocol guarantees that a default is visible and timestamped, not that it cannot happen. Devnet instruments carry no monetary value. Smart-contract risk and jurisdictional questions are discussed in the full document. | [DEGISTI: em-dash kalktı] |
| W-08 | §6 Roadmap | Mainnet launch follows third-party audit and a minimum six-month devnet record. Planned work includes amortizing structures, a standardized disclosure schema for borrowers, and listing additional real-world instruments alongside bonds. | [DEGISTI: more instruments iması] |
| W-09 | §7 Regulatory posture | Lacus is software that two parties use to document and execute a private loan between themselves. The protocol takes no custody, no spread, and no discretion over payments. | [YENI] |
| W-10 | İndirme butonu | Download PDF ↗ | [AYNI] |

---

# PD · Pitch

| ID | Yer | Metin | Durum |
|---|---|---|---|
| PD-01 | Kicker / H1 | Investor deck / The Lacus pitch. | [DEGISTI: em-dash kalktı] |
| PD-02 | Viewer kapak satırı | Crypto that does what banks do. | [DEGISTI] |
| PD-03 | Kontroller | ‹ {1 / 12} › · DOWNLOAD PDF ↗ | [AYNI] |
