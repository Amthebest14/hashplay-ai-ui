const { Client, AccountBalanceQuery } = require('@hashgraph/sdk');
async function main() {
    const client = Client.forMainnet();
    const bal = await new AccountBalanceQuery().setAccountId('0.0.10418925').execute(client);
    console.log("Balance:", bal.hbars.toString(), "HBAR");
    client.close();
}
main().catch(console.error);
