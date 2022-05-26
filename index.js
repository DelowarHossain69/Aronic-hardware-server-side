const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { application } = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIP_SECRECT_KEY);

// Middleware
app.use(express.json());
app.use(cors());

const verifyToken = (req, res, next) => {
  const email = req.query.email;
  const auth = req.headers.auth;
  if (!auth) {
    return res.status(401).send({ message: "Unauthorized user" });
  }
  
  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.status(403).send({ message: "Forbidden access-" });
    }

    const decodedEmail = decoded.email;

    if (email === decodedEmail) {
      req.decoded = email;
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

    const orderCollection = client
      .db("Aronic_hardware_shop")
      .collection("orders");

    const ratingCollection = client
      .db("Aronic_hardware_shop")
      .collection("rating");

      // Verify admin
      const verifyAdmin = async(req, res, next) => {
        const email = req.decoded;
        const query = {email};
        const user = await userCollection.findOne(query);

        if(user?.role === 'Admin') {
          next();
        }
        else{
            res.status(403).send({message : 'Frobidden access'});
        }
      }

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

    // Add product (Admin control)
    app.post('/product', async(req, res)=>{
      const productInfo = req.body;
      const result = await productCollection.insertOne(productInfo);
      res.send(result);
    });

    // get all products
    app.get("/products", async (req, res) => {
      const data = await productCollection.find().toArray();
      const result = data.reverse();
      res.send(result);
    });

    // get single product by id
    app.get("/product/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // delete product (admin control)
    app.delete('/product', async(req, res)=> {
      const {id} = req.query;
      const query = {_id : ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      res.send(result); 
    });

    // update product (admin control);
    app.put('/product/:id', async(req, res)=> {
      const updatedInfo = req.body;
      const {id} = req.params;
      const query = {_id : ObjectId(id)};
      const option = {upsert: true};
      const doc = {$set : updatedInfo};
      const result = await productCollection.updateOne(query, doc, option);
      res.send(result);
    });

    /**
     * Order manage
     * */

    // insert orders
    app.post("/order", verifyToken, async (req, res) => {
      const orderInfo = req.body;
      const result = await orderCollection.insertOne(orderInfo);
      res.send(result);
    });

    // get customer orders
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const orders = await orderCollection.find(query).toArray();
      const resentOrders = orders.reverse();
      res.send(resentOrders);
    });

    // get order details
    app.get('/orderDetails', verifyToken, async(req, res)=>{
        const {id} = req.query;
        const query = {_id : ObjectId(id)};
        const result = await orderCollection.findOne(query);
        res.send(result);
    });

    // delete order
    app.delete("/order", verifyToken, async (req, res) => {
      const { id } = req.query;
      const query = { _id: ObjectId(id) };
      const product = await orderCollection.findOne(query);

      if (!product?.paid) {
        const result = await orderCollection.deleteOne(query);
        res.send({ success: true, result });
      } else {
        res.send({ success: false });
      }

    });

    // update orders (Admin control)
    app.put('/updateOrder', verifyToken, async(req, res)=>{
        const {id} = req.query;
        const updatedDoc = req.body;
        const option = {upsert : true};
        const doc = {$set : updatedDoc};
        const query = {_id : ObjectId(id)};
        const result = await orderCollection.updateOne(query, doc, option);
        res.send(result);
    });

    // order cancel (Admin control)
    app.delete('/orderCancel', verifyToken, async(req, res)=>{
        const {id} = req.query;
        console.log(' hi ', id)
        const query = {_id : ObjectId(id)};
        const result = await orderCollection.deleteOne(query);
        res.send(result);
    });

    // get all orders (admin control)
    app.get('/manageOrders', verifyToken, async(req, res)=>{
        const orders = await orderCollection.find().toArray();
        const recentOrders = orders.reverse();
        res.send(recentOrders);
    });

    // Add product review
    app.post('/rating', verifyToken, async(req, res)=>{
        const reviewInfo = req.body;
        console.log(reviewInfo)
        const result = await ratingCollection.insertOne(reviewInfo);
        res.send(result);
    });

    // get all reviews
    app.get('/rating', async(req, res)=> {
      const result = await ratingCollection.find().toArray();
      const resentReview = result.reverse();
      res.send(resentReview);
    });
    /**
     *
     * User manage
     *
     */

    // Create user with jwt;
    app.put("/user", async (req, res) => {
      const { name, email, image } = req.body;
      const updatedDoc = { $set: { name, email, image } };
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

    // get single user
    app.get('/user', verifyToken, async(req, res)=>{
      const email = req.query.email;
      const query = {email};
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // update user profle
    app.put('/updateUser', verifyToken, async(req, res) => {
      const email = req.query.email;
      const query = {email};
      const updatedData = req.body;
      const option = {upsert : true};
      const info = {$set : updatedData};
      const result = await userCollection.updateOne(query, info, option);
      
      if(result){
        res.send({success : true, result});
      }
      else{
        res.send({success : false});
      }
    });

    // Get all user
    app.get('/allUser', async(req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // delete user
    app.delete('/user', verifyToken, verifyAdmin, async(req, res)=> {
        const {id} = req.query;
        const query = {_id : ObjectId(id)};
        const result = await userCollection.deleteOne(query);
        res.send(result);
    });

    // Create Admin
    app.put('/admin', verifyToken, verifyAdmin, async(req, res) => {
      const {id} = req.query;
      const query = {_id : ObjectId(id)};
      const doc = {$set : {role : 'Admin'}};
      const result = await userCollection.updateOne(query, doc);
      res.send(result);
    });

    // is admin
    app.get('/isAdmin', async(req, res)=>{
      const {email} = req.query;
      const user = await userCollection.findOne({email});

      if(user?.role === "Admin"){
        res.send({isAdmin : true});
      }
      else{
        res.send({isAdmin : false});
      }
    });

    /*//================= Payment get way ===================*/

    app.post("/create-payment-intent",  async (req, res) =>{
      console.log('hi');
      const {price} = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })


    // app.post("/create-payment-intent"), async (req, res) => {
    //   console.log('hi');
    //   const {price} = req.body;
    //   const amount = price * 100;

    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_methods_types: ['card']
    //   });
    
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    

  } finally {
  }
}

run().catch(console.dir);

// The app is listening 5000 port
app.listen(PORT, () => {
  console.log("The app is running.");
});
