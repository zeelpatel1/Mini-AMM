import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MiniAmm } from "../target/types/mini_amm";
import {PublicKey, SystemProgram} from '@solana/web3.js'
import {createMint, getOrCreateAssociatedTokenAccount, mintTo} from '@solana/spl-token'
import { BN } from "bn.js";

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

  let user=anchor.web3.Keypair.generate();
  let userAtaB;
  let userAtaA;

  before(async()=>{
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    )

    userAtaA=await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      user.publicKey
    );

    userAtaB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      user.publicKey,
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintA,
      userAtaA.address,
      provider.wallet.publicKey,
      100_000
    )

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintB,
      userAtaB.address,
      provider.wallet.publicKey,
      100_000
    )
  })

  let poolTokenA;
  let poolTokenB;


  it("initialize pool", async () => {

    const [poolPDA,bump]=await PublicKey.findProgramAddressSync(
      [Buffer.from("pool"),provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const amountA = new anchor.BN(100_000);
    const amountB = new anchor.BN(100_000);

    poolTokenA=anchor.web3.Keypair.generate();
    poolTokenB=anchor.web3.Keypair.generate();

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

  it("add liquidity",async()=>{

    const amountA=new BN(1_000);
    const amountB=new BN(1_000);

    const [poolPDA, bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.addLiquidity(amountA,amountB,bump).accounts({
      user:user.publicKey,
      userTokenA:userAtaA.address,
      userTokenB:userAtaB.address,
      poolTokenA:poolTokenA.publicKey,
      poolTokenB:poolTokenB.publicKey,
      pool: poolPDA,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    }).signers([user]).rpc()
    

  })

});