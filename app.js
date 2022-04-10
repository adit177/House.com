if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


const express=require("express")
const mongoose=require("mongoose");
const app=express();
const path=require("path");
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError");
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride=require("method-override");
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
const MongoStore = require('connect-mongo');

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

mongoose.connect(dbUrl,{
    useNewUrlParser:true,
    useUnifiedTopology:true,
});
const db=mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("Database Connected")
});

app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"))
app.engine("ejs",ejsMate)

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"))
app.use(express.static(path.join(__dirname, 'public')))
app.use(mongoSanitize({
    replaceWith: '_'
}))

const store = new MongoStore({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});
store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
});

const sessionConfig = {
    store,
    name:'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
app.use(flash());
//app.use(helmet({contentSecurityPolicy: false }));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    //console.log(req.session)
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.use('/', userRoutes);
app.use('/houses', campgroundRoutes)
app.use('/houses/:id/reviews', reviewRoutes)

app.get("/",(req,res)=>{
    res.render("home")
});


app.all("*",(req,res,next)=>{
    next(new ExpressError("Page Not Found",404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

const port=process.env.PORT || 4000;
app.listen(port,()=>{
    console.log(`Serving on port ${port}`)
})
//FRUoiIHdB7rjOfxW