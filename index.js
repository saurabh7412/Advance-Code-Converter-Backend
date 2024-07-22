const express = require("express");
const axios = require("axios");
const app = express();
const cors = require("cors");
const { Octokit } = require("@octokit/rest");
require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

app.use(cors());
app.use(express.json());
const CLIENT_ID = process.env.client_id;
const CLIENT_SECRET = process.env.client_secret;
app.get("/", (req, res) => {
  res.json({ data: "Backend Github AI" });
});

// app.get("/getToken", async (req, res) => {
//   console.log("code", req.query.code);
//   const params =
//     "?client_id=" +
//     CLIENT_ID +
//     "&client_secret=" +
//     CLIENT_SECRET +
//     "&code=" +
//     req.query.code +
//     "&scope=repo";

//   console.log("params", params);

//   await fetch("https://github.com/login/oauth/access_token" + params, {
//     method: "POST",
//     headers: {
//       Accept: "application/json",
//     },
//   })
//     .then((res) => {
//       console.log("res", res)
//       return res.json()
//     })
//     .then((data) => {
//       console.log("data", data)
//       return res.json(data);
//     });
// });

app.get("/getToken", async (req, res) => {
  console.log("code", req.query.code);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: req.query.code,
    scope: 'repo'
  });

  console.log("params", params.toString());

  try {
    const response = await axios.get(
      "https://github.com/login/oauth/access_token",
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: req.query.code,
          redirect_uri: `http://localhost:3000/`,
        },
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "application/json",
        },
      }
    );

    console.log("response", response.data);
    const access_token = response.data.access_token;
    res.json({ access_token });
  } catch (error) {
    console.error("Error fetching access token:", error);
    res.status(500).json({ error: "Failed to fetch access token" });
  }
});

app.post("/push", async (req, res) => {
  const {
    accessToken,
    brandName,
    fileContent,
    fileName,
    owner,
    repo,
    commitMessage,
  } = req.body;
  const octokit = new Octokit({
    auth: accessToken,
  });

  try {
    // Get the current commit SHA for the default branch
    const { data: branchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: brandName, // Replace with your default branch name
    });

    // Get the latest commit on the branch
    const latestCommitSha = branchData.commit.sha;

    console.log("latestCommitSha", latestCommitSha);

    // Get the current tree of the latest commit
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: latestCommitSha,
      recursive: true,
    });

    // Find the file if it already exists in the tree
    const file = treeData.tree.find((item) => item.path === fileName);

    console.log(file);

    if (file) {
      // If the file exists, update it
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: fileName,
        message: `${commitMessage}`,
        content: Buffer.from(fileContent).toString("base64"),
        sha: file.sha,
        branch: brandName, // Replace with your default branch name
      });
    } else {
      // If the file doesn't exist, create it

      console.log("elseeee")
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: fileName,
        message: `${commitMessage}`,
        content: Buffer.from(fileContent).toString("base64"),
        branch: brandName, // Replace with your default branch name
      });
    }

    console.log(`File "${fileName}" created/updated successfully!`);
    res.json({ isSuccess: true });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(404).json({ isSuccess: false });

    // Print the error message
  }
});
app.listen(8080, () => {
  console.log("started");
});

// access token - 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
