const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(express.json());
app.use(cors());

// default route
app.get('/', (req, res)=>{
    res.send('hello world');
});

// Mongodb interface

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuivm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const productCollection = client.db('Aronic_hardware_shop').collection('products');

        console.log('connection')
    }
    finally{

    }
}

run().catch(console.dir);

// The app is listening 5000 port
app.listen(PORT, ()=>{
    console.log('The app is running.');
})