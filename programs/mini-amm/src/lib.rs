use anchor_lang::prelude::*;
use anchor_spl::token::{self,Transfer,Mint,TokenAccount,Token};

declare_id!("EdUqZw6mNEVrtDYLzvKn9afcZLciWxrm9F5xLzJ4gn7D");

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


        Ok(())   
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {

    #[account(mut)]
    pub owner_pool:Signer<'info>,

    pub token_a_mint:Account<'info,Mint>,
    pub token_b_mint:Account<'info,Mint>,

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
        token::authority = pool,   // pool PDA owns the vault
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