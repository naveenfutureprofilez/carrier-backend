const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");

exports.carriers_listing = catchAsync(async (req, res) => {
    const Query = new APIFeatures(
      User.find({
        role: 1,
        deletedAt : null || ''
      }),
      req.query
    ).sort();

   const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
   const data = await query;

   res.json({
     status: true,
     carriers: data,
     page : page,
     totalPages : totalPages,
     message: data.length ? undefined : "No files found"
   });
});
