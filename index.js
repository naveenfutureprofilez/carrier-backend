const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config()
const globalErrorHandler = require("./middlewares/gobalErrorHandler");
const errorHandler = require("./middlewares/errorHandler");
// require("./db/config"); 
// Your Vercel function (e.g., api/users.js)
const cookieParser = require('cookie-parser');
app.use(cookieParser());


const connectDB = require('./db/config'); // Adjust path as needed
connectDB();
const multer = require('multer');
const Files = require('./db/Files');
const os = require('os');
// const corsOptions = {
//   origin: '*',
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true,
// };
// app.use(cors(corsOptions));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(errorHandler);
app.use(globalErrorHandler);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit:'2000mb'}));
app.use("/user", require('./routes/authRoutes'));
app.use("/user", require('./routes/userRoutes'));
app.use("", require('./routes/carrierRoutes'));
app.use("", require('./routes/orderRoutes'));
app.use("", require('./routes/customerRoutes'));
app.use(express.json());
const path = require('path');

const uploadDir = path.join(os.tmpdir(), 'uploads');
const fileupload = require('./utils/fileupload');
const { validateToken } = require('./controllers/authController');
const User = require('./db/Users');
const EmployeeDoc = require('./db/EmployeeDoc');
const multerParse = multer({
  dest: uploadDir,
});

app.post("/cloud/upload/:id", validateToken, multerParse.fields([{name: "attachment",},]),
  async (req, res) => {
    const orderid = req.params.id; 
    const attachment = req.files?.attachment?.[0];
    if (!attachment) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    try {
      const uploadResponse = await fileupload(attachment);
      console.log("req.user._id",req.user._id)
      if (uploadResponse) {
        const file = new Files({
          name: uploadResponse.file.originalname,
          mime: uploadResponse.mime,
          filename: uploadResponse.filename,
          url: uploadResponse.url,
          order: orderid,
          size : uploadResponse.size,
          added_by: req.user._id
        });
        const fileupoaded = await file.save();
        console.log("fileupoaded",fileupoaded)
        if (!fileupoaded) {
          return res.status(500).json({
            message: "File upload failed",
            error :{uploadResponse, fileupoaded},
            status:true
          });
        }
        return res.status(201).json({
          message: "File uploadeded to storage.",
          file_data: fileupoaded,
          status:true
        });
      } else {
        res.status(500).json({
          message: "File upload failed",
          error :uploadResponse,
          status:false
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "An error occurred during file upload",
        error: error
      });
    }
  }
);

app.post("/upload/employee/doc/:id", validateToken, multerParse.fields([{name: "attachment",},]),
  async (req, res) => {
    const userid = req.params.id; 
    const attachment = req.files?.attachment?.[0];
    if (!attachment) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    try {
      const uploadResponse = await fileupload(attachment);
      if (uploadResponse) {
        const file = new EmployeeDoc({
          name: uploadResponse.file.originalname,
          mime: uploadResponse.mime,
          filename: uploadResponse.filename,
          url: uploadResponse.url,
          user: userid,
          size : uploadResponse.size,
          added_by: req.user._id
        });
        const fileupoaded = await file.save();
        console.log("fileupoaded",fileupoaded)
        if (!fileupoaded) {
          return res.status(500).json({
            message: "File upload failed",
            error :{uploadResponse, fileupoaded},
            status:true
          });
        }
        return res.status(201).json({
          message: "Document uploaded successfully.",
          file_data: fileupoaded,
          status:true
        });
      } else {
        res.status(500).json({
          message: "Document uploading failed.",
          error :uploadResponse,
          status:false
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "An error occurred during file upload",
        error: error
      });
    }
  }
);

app.get('/', (req, res) => {
  res.send({
    message: "ACTIVE site active",
    status: 200
  });
});


app.all('*', (req, res, next) => {
  res.status(404).json({
      status: 404,
      message: `NOT FOUND`
  });
});

const port = process.env.PORT || '8080';
app.listen(port, () => { console.log(`On PORT ${port} SERVER RUNNINGGGGG.....`) });
