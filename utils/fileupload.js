const axios = require("axios");
const fs = require("fs");

const fileupload = async (file) => {
   try {
     const filePath = file.path;
     const fileStream = fs.createReadStream(filePath);
     const originalFilename = file.originalname.replace(/\s/g, '');
     const uniqueFilename = `${Date.now()}-${file.filename}-${originalFilename}`;
     const yourStorageZone = process.env.BUNNY_STORAGE_ZONE;
     const url = `https://storage.bunnycdn.com/${yourStorageZone}/${uniqueFilename}`;
     const headers = {
       AccessKey: process.env.BUNNY_API_KEY,
       "Content-Type": file.mimetype,
     };
 
     const response = await axios.put(url, fileStream, { headers });
     if (response.status === 201 || response.status === 200) {
       console.log("File uploaded successfully", response);
       return {
         message: "File uploaded successfully",
         mime: file.mimetype,
         filename: uniqueFilename,
         url: `https://${yourStorageZone}.b-cdn.net/${uniqueFilename}`,
         file: file,
         size: file.size,
       };
     } else {
       console.error(`Upload failed with status: ${response.status}`);
       return false;
     }
   } catch (error) {
     console.error(`Upload error: ${error.message}`);
     return false;
   }
 };
 

module.exports = fileupload;