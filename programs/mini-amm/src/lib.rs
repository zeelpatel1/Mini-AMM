use anchor_lang::prelude::*;
use anchor_spl::token::{self,Transfer,Mint,TokenAccount,Token};

declare_id!("FjFSA6SWfX4gbmxQSaUZkesAStFjRneS9PkbimdNvKbS");

#[program]
pub mod mini_amm {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>,amount_a:u64,amount_b:u64,_bump:u8) -> Result<()> {

        let pool=&mut ctx.accounts.pool;
        pool.token_a_amount=amount_a;
        pool.token_b_amount=amount_b;
        pool.token_a_mint=ctx.accounts.token_a_mint.key();
        pool.token_b_mint=ctx.accounts.token_b_mint.key();
        pool.owner=ctx.accounts.owner_pool.key();

        let cpi_accounts = Transfer {
            from: ctx.accounts.a_ata.to_account_info(),
            to: ctx.accounts.pool_token_a.to_account_info(),
            authority: ctx.accounts.owner_pool.to_account_info(),
        };

        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount_a,
        )?;


        Ok(())
    }

    pub fn add_liquidity(ctx:Context<AddLiquidity>,amount_a:u64,amount_b:u64,bump:u8) -> Result<()> {

        token::transfer(ctx.accounts.transfer_a_context(), amount_a)?;

        token::transfer(ctx.accounts.transfer_b_context(), amount_b)?;

        let pool=&mut ctx.accounts.pool;
        pool.token_a_amount+=amount_a;
        pool.token_b_amount+=amount_b;

        Ok(())
    }

}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {

    #[account(mut)]
    pub user:Signer<'info>,

    #[account(mut)]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    pub token_program: Program<'info, Token>,

}

#[derive(Accounts)]
pub struct InitializePool<'info> {

    #[account(mut)]
    pub owner_pool:Signer<'info>,

    pub token_a_mint:Account<'info,Mint>,
    pub token_b_mint:Account<'info,Mint>,

     #[account(
        mut,
        constraint = a_ata.owner == owner_pool.key(),
        constraint = a_ata.mint == token_a_mint.key(),
    )]
    pub a_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = b_ata.owner == owner_pool.key(),
        constraint = b_ata.mint == token_b_mint.key(),
    )]
    pub b_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer=owner_pool,
        space=120,
        seeds=[b"pool",owner_pool.key().as_ref()],
        bump,
    )]
    pub pool:Account<'info,Pool>,

     #[account(
        init,
        payer=owner_pool,
        token::mint = token_a_mint,
        token::authority = pool,
    )]
    pub pool_token_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer=owner_pool,
        token::mint = token_b_mint,
        token::authority = pool, 
    )]
    pub pool_token_b: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,

}

#[account]
pub struct Pool {
    pub token_a_amount:u64,
    pub token_b_amount:u64,
    pub token_a_mint:Pubkey,
    pub token_b_mint:Pubkey,
    pub owner:Pubkey,
}

impl<'info> AddLiquidity<'info> {
    pub fn transfer_a_context(&self) -> CpiContext<'_,'_,'_,'info,Transfer<'info>> {
        let cpi_account=Transfer{
            from:self.user_token_a.to_account_info(),
            to:self.pool_token_a.to_account_info(),
            authority:self.user.to_account_info()
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_account)
    }

    pub fn transfer_b_context(&self) -> CpiContext<'_, '_, '_, 'info, token::Transfer<'info>> {
        let cpi_accounts = token::Transfer {
            from: self.user_token_b.to_account_info(),
            to: self.pool_token_b.to_account_info(),
            authority: self.user.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}