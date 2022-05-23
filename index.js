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




// The app is listening 5000 port
app.listen(PORT, ()=>{
    console.log('The app is running.');
})