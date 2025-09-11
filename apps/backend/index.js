// server.js
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

const ETHERSCAN_API_KEY = "W1P2BWYQ6BE5E5Y3M8QUW5U3XG8S42W842";

app.get("/transactions/:address", async (req, res) => {
  const { address } = req.params;

  try {
    const url = `https://api.etherscan.io/api
      ?module=account
      &action=txlist
      &address=${address}
      &startblock=0
      &endblock=99999999
      &page=1
      &offset=100
      &sort=asc
      &apikey=${ETHERSCAN_API_KEY}`.replace(/\s+/g, "");

    const { data } = await axios.get(url);

    if (data.status === "1") {
      const transactions = data.result.map(tx => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        valueETH: Number(tx.value) / 1e18,
        timestamp: new Date(tx.timeStamp * 1000).toISOString(),
      }));

      res.json({
        address,
        totalTransactions: transactions.length,
        transactions,
      });
    } else {
      res.status(404).json({ error: "No transactions found or invalid address" });
    }
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
