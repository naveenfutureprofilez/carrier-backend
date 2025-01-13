const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config()
const globalErrorHandler = require("./middlewares/gobalErrorHandler");
const errorHandler = require("./middlewares/errorHandler");
const { validateToken } = require('./controllers/authController');
require('./db/config');

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};



app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(errorHandler);
app.use(globalErrorHandler);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit:'2000mb'}));
app.use("/user", require('./routes/authRoutes'));
app.use("/user", require('./routes/userRoutes'));
app.use("", require('./routes/carrierRoutes'));
app.use("", require('./routes/orderRoutes'));
app.use("", require('./routes/driverRoutes'));
app.use("", require('./routes/customerRoutes'));

app.use(express.json());
app.get('/', (req, res) => {
  res.send({
    message: "ACTIVE last2",
    status: 200
  });
});



app.all('*', (req, res, next) => {
  res.status(404).json({
      status: 404,
      message: `NOT FOUND`
  });
});

const port = process.env.PORT;
app.listen(port, () => { console.log(`On PORT ${port} SERVER RUNNINGGGGG.....`) });
