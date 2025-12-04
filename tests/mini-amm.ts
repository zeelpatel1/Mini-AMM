import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MiniAmm } from "../target/types/mini_amm";
import {PublicKey, SystemProgram} from '@solana/web3.js'
import {createMint, getOrCreateAssociatedTokenAccount, mintTo} from '@solana/spl-token'

describe("mini-amm", () => {

  const provider=anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.miniAmm as Program<MiniAmm>;


  let mintA:PublicKey;
  let mintB:PublicKey;

  let ataA;
  let ataB;

  before(async()=>{
      mintA=await createMint(
        provider.connection,
        provider.wallet.payer,
        provider.wallet.publicKey,
        null,
        9
      );

      ataA=await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        mintA,
        provider.wallet.publicKey,
      );

      await mintTo(
        provider.connection,
        provider.wallet.payer,
        mintA,
        ataA.address,
        provider.wallet.publicKey,
        1_000_000
      );

      console.log("Owner ATA for Mint A:", ataA.address.toBase58());

      mintB=await createMint(
        provider.connection,
        provider.wallet.payer,
        provider.wallet.publicKey,
        null,
        9
      );

      ataB=await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        mintB,
        provider.wallet.publicKey,
      );

      await mintTo(
        provider.connection,
        provider.wallet.payer,
        mintB,
        ataB.address,
        provider.wallet.publicKey,
        1_000_000
      );

      console.log("Owner ATA for Mint B:", ataB.address.toBase58());
    })

  it("initialize pool", async () => {

    const [poolPDA,bump]=await PublicKey.findProgramAddressSync(
      [Buffer.from("pool"),provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const poolTokenA = anchor.web3.Keypair.generate();
    const poolTokenB = anchor.web3.Keypair.generate();

    const amountA = new anchor.BN(100_000);
    const amountB = new anchor.BN(100_000);

    await program.methods.initializePool(amountA,amountB,bump).accounts({
      ownerPool:provider.wallet.publicKey,
      tokenAMint:mintA,
      tokenBMint:mintB,

      aAta:ataA.address,
      bAta:ataB.address,

      pool:poolPDA,
      poolTokenA:poolTokenA.publicKey,
      poolTokenB:poolTokenB.publicKey,
      
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY
      
    }).signers([poolTokenA,poolTokenB]).rpc()

    const poolState=await program.account.pool.fetch(poolPDA);

    console.log("Pool state:", poolState);
    
  });
});