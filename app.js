const express = require('express'); 
const bodyParser = require('body-parser'); 
const session = require('express-session'); 
const flash = require('express-flash'); 
const connectToDatabase = require('./db'); // Import the database connection function 
const path = require('path'); // Import path module for handling file paths 
 
const app = express(); 
const PORT = 3000; // Change this port if needed 
 
app.set('view engine', 'ejs'); // Set EJS as the templating engine 
app.set('views', path.join(__dirname, 'views')); // Set the views directory 
 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(session({ 
    secret: 'your_secret_key', 
    resave: false, 
    saveUninitialized: true 
})); 
app.use(flash()); 
 
app.get('/', (req, res) => { 
    console.log('Home page route accessed'); // Log access to the home page 
    res.send(` 
        <h1>Book Management System</h1> 
        <a href="/signup">Sign Up</a><br> 
        <a href="/signin">Sign In</a> 
    `); 
}); 
 
app.get('/signup', (req, res) => { 
    console.log('Sign-up page route accessed'); // Log access to the sign-up page 
    res.render('signup', { messages: req.flash() }); // Render the signup EJS file with flash messages 
}); 
 
app.post('/signup', async (req, res) => { 
    const { username, password } = req.body; // Get username and password from request body 
    const db = req.app.locals.db; // Access the database connection from app locals 
 
    try { 
        // Check if username already exists 
        const existingUser = await db.collection('users').findOne({ username }); 
        if (existingUser) { 
            req.flash('error', 'Username already exists. Please choose another.'); // Flash error message 
            return res.redirect('/signup'); // Redirect back to sign-up page 
        } 
 
        // Insert new user into the database 
        await db.collection('users').insertOne({ username, password }); 
        req.flash('success', 'Sign-up successful! You can now sign in.'); // Flash success message 
        res.redirect('/signin'); // Redirect to sign-in page 
    } catch (error) { 
        console.error('Error during sign-up:', error); // Log error message 
        req.flash('error', 'An error occurred during sign-up. Please try again.'); // Flash error message 
        res.redirect('/signup'); // Redirect back to sign-up page 
    } 
}); 
 
app.get('/signin', (req, res) => { 
    console.log('Sign-in page route accessed'); // Log access to the sign-in page 
    res.render('signin', { messages: req.flash() }); // Render the sign-in EJS file with flash messages 
}); 
 
app.post('/signin', async (req, res) => { 
    const { username, password } = req.body; // Get username and password from request body 
    const db = req.app.locals.db; // Access the database connection from app locals 
 
    try { 
        // Find the user in the database 
        const user = await db.collection('users').findOne({ username, password }); 
        if (!user) { 
            req.flash('error', 'Invalid username or password. Please try again.'); // Flash error message 
            return res.redirect('/signin'); // Redirect back to sign-in page 
        } 
 
        // Store user information in session 
        req.session.user = user; // Store user in session for tracking logged-in status 
        res.redirect('/actions'); // Redirect to actions page upon successful login 
    } catch (error) { 
        console.error('Error during sign-in:', error); // Log error message 
        req.flash('error', 'An error occurred during sign-in. Please try again.'); // Flash error message 
        res.redirect('/signin'); // Redirect back to sign-in page 
    } 
}); 
 
// Add this code to app.js 
app.get('/actions', (req, res) => { 
    if (!req.session.user) { 
        return res.redirect('/signin'); // Redirect to sign-in if user is not logged in 
    } 
 
    const isAdmin = req.session.user.username === 'admin'; // Check if the user is admin 
    res.render('actions', { user: req.session.user, isAdmin }); // Render actions EJS file 
}); 
 
// Add this code to app.js 
app.get('/logout', (req, res) => { 
    req.session.destroy(err => { 
        if (err) { 
            console.error('Error during logout:', err); // Log error if any 
            return res.redirect('/'); // Redirect to home on error 
        } 
        res.redirect('/'); // Redirect to home page after successful logout 
    }); 
}); 
 
// Add this code to app.js 
app.get('/view-users', async (req, res) => { 
    if (!req.session.user || req.session.user.username !== 'admin') { 
        return res.redirect('/signin'); // Redirect to sign-in if not admin 
    } 
 
    const db = req.app.locals.db; // Access the database connection from app locals 
    try { 
        const users = await db.collection('users').find({}).toArray(); // Fetch all users 
        res.render('viewUsers', { users, messages: req.flash() }); // Render the viewUsers EJS file with the users data 
    } catch (error) { 
        console.error('Error fetching users:', error); // Log error message 
        req.flash('error', 'An error occurred while fetching users.'); // Flash error message 
        res.redirect('/actions'); // Redirect back to actions page 
    } 
}); 
 
// Add this code to app.js 
app.post('/delete-users', async (req, res) => { 
    if (!req.session.user || req.session.user.username !== 'admin') { 
        req.flash('error', 'You do not have permission to perform this action.'); // Flash error message 
        return res.redirect('/view-users'); // Redirect if not admin 
    } 
 
    const usernamesToDelete = req.body.usernames; // Get selected usernames from request body 
    const db = req.app.locals.db; // Access the database connection from app locals 
 
    if (!usernamesToDelete || !Array.isArray(usernamesToDelete)) { 
        req.flash('error', 'No users selected for deletion.'); // Flash error message if no users selected 
        return res.redirect('/view-users'); // Redirect back to view users page 
    } 
 
    try { 
        // Delete selected users from the database 
        const result = await db.collection('users').deleteMany({ username: { $in: usernamesToDelete } }); 
        if (result.deletedCount > 0) { 
            req.flash('success', 'Selected users deleted successfully.'); // Flash success message 
        } else { 
            req.flash('error', 'No users were deleted.'); // Flash error message if no users were deleted 
        } 
        res.redirect('/view-users'); // Redirect to view users page 
    } catch (error) { 
        console.error('Error deleting users:', error); // Log error message 
        req.flash('error', 'An error occurred while deleting users.'); // Flash error message 
        res.redirect('/view-users'); // Redirect back to view users page 
    } 
}); 
 
// Function to start the server after database connection 
async function startServer() { 
    let client; // Declare client variable to hold MongoDB client 
    try { 
        const { db, client: mongoClient } = await connectToDatabase(); // Establish the database connection 
        client = mongoClient; // Store the client to keep it open 
        app.locals.db = db; // Store the database connection in app locals 
        console.log('Connected to MongoDB'); // Log success message 
 
        app.listen(PORT, () => { 
            console.log(`Server is running on http://localhost:${PORT}`); 
        }); 
    } catch (error) { 
        console.error('Failed to connect to MongoDB:', error); // Log error message 
    } 
 
    // Gracefully handle application shutdown 
    process.on('SIGINT', async () => { 
        if (client) { 
            await client.close(); // Close the MongoDB client connection 
            console.log('MongoDB client disconnected'); // Log disconnection message 
        } 
        process.exit(0); // Exit the application 
    }); 
} 
 
startServer(); // Call the function to start the server