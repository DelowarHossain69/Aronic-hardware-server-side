const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = process.env.PORT || 5000;
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(cors());

const verifyToken = (req, res, next) => {
  const email = req.query.email;
  console.log(email);
  const auth = req.headers.auth;
  if (!auth) {
    return res.status(401).send({ message: "Unauthorized user" });
  }

  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "Forbidden access" });
    }

    const decodedEmail = decoded.email;

    if (email === decodedEmail) {
      next();
    } else {
      res.status(403).send({ message: "Forbidden access" });
    }
  });
};

// default route
app.get("/", (req, res) => {
  res.send("hello world");
});

// Mongodb interface

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuivm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productCollection = client
      .db("Aronic_hardware_shop")
      .collection("products");
    const userCollection = client
      .db("Aronic_hardware_shop")
      .collection("users");

    // get products
    app.get("/resent-products", async (req, res) => {
      const productCount = await productCollection.estimatedDocumentCount();
      const products = productCollection.find();
      if (productCount > 6) {
        const result = await products.skip(productCount - 6).toArray();
        const resentData = result.reverse();
        res.send(resentData);
      } else {
        const result = await products.toArray();
        const resentData = result.reverse();
        res.send(resentData);
      }
    });

    // get all products
    app.get('/products', async(req, res) => {
        const data = await productCollection.find().toArray();
        const result = data.reverse();
        res.send(result);
    });

    // get single product by id
    app.get('/product/:id', verifyToken, async(req, res)=>{
        const id = req.params.id;
        const query = {_id : ObjectId(id)};
        const result = await productCollection.findOne(query);
        res.send(result);
    });
    /**
     *
     * User manage
     *
     */

    app.put("/user", async (req, res) => {
      const { name, email } = req.body;
      const updatedDoc = { $set: { name, email } };
      const query = { email };
      const option = { upsert: true };

      const result = await userCollection.updateOne(query, updatedDoc, option);

      if (result) {
        const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });

        res.send({ success: true, accessToken });
      } else {
        res.send({ success: false, accessToken: null });
      }
    });
  } 
  finally {
  }
}

run().catch(console.dir);

// The app is listening 5000 port
app.listen(PORT, () => {
  console.log("The app is running.");
});
