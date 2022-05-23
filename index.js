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

        // get products
        app.get('/resent-products', async(req, res)=>{
            const productCount = await productCollection.estimatedDocumentCount();
            const products = productCollection.find();
            if(productCount > 6){
                const result = await products.skip(productCount - 6).toArray();
                res.send(result);
            }
            else{
                const result = await products.toArray();
                res.send(result);
            }
        });
    }
    finally{

    }
}

run().catch(console.dir);

// The app is listening 5000 port
app.listen(PORT, ()=>{
    console.log('The app is running.');
})