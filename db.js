const { MongoClient } = require('mongodb'); 
 
const url = 'mongodb://localhost:27017'; 
const dbName = 'LoginInfo2'; 
 
async function connectToDatabase() { 
    let client; 
 
    try { 
        client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }); 
        console.log('Connected to MongoDB'); 
 
        const db = client.db(dbName); 
 
        // Check if the "users" collection exists 
        const collections = await db.listCollections({ name: 'users' }).toArray(); 
        if (collections.length === 0) { 
            console.log('Collection "users" does not exist. It will be created upon first insertion.'); 
        } 
 
        return { db, client }; // Return both db and client 
    } catch (error) { 
        console.error('Error connecting to MongoDB:', error); 
        throw error; // Rethrow the error for handling in the main app 
    } 
} 
 
module.exports = connectToDatabase;