const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config()
const globalErrorHandler = require("./middlewares/gobalErrorHandler");
const errorHandler = require("./middlewares/errorHandler");
require("./db/config"); 
const multer = require('multer');
const Files = require('./db/Files');
const os = require('os');


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
app.use("", require('./routes/customerRoutes'));
app.use(express.json());
const path = require('path');
const uploadDir = path.join(os.tmpdir(), 'uploads'); // Define the

const fileupload = require('./utils/fileupload');
const { validateToken } = require('./controllers/authController');
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
      console.log("uploadResponse",uploadResponse)
      if (uploadResponse) {
        const file = new Files({
          name: uploadResponse.file.originalname,
          mime: uploadResponse.mime,
          filename: uploadResponse.filename,
          url: uploadResponse.url,
          order: orderid,
          size : uploadResponse.size,
        });
        const fileupoaded = await file.save();
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

const port = process.env.PORT || '8080';
app.listen(port, () => { console.log(`On PORT ${port} SERVER RUNNINGGGGG.....`) });
