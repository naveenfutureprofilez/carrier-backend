const User = require("../db/Users");
const APIFeatures = require("../utils/APIFeatures");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const filterObj = async (obj, ...allowed) => { 
   let newObj = {};
   Object.keys(obj).forEach(el=>{ 
      if(allowed.includes(el)) newObj[el]= obj[el];
   });
   return newObj;
}


exports.updateCurrentUserData = catchAsync( async (req, res, next) => { 
   if(req.body.password || req.body.confirmPassword){
      res.json({
         status:false,
         message:"'Password can not changed via this request.'"
      });
   }
   const allowedFields = await filterObj(req.body, 'name', 'email', 'username', 'avatar');
   const user = await User.findByIdAndUpdate(req.user.id, allowedFields, {
      new : true, 
      runValidators : true
   });

   if(req.body.email !== ''){
     user.mailVerifiedAt = null
     await user.save();
   }

   return res.status(200).json({
      status:true,
      user: user,
      message:"User updated !!"
   });
});


exports.deleteCurrentUser = catchAsync( async (req, res, next) => { 
   const user = await User.findByIdAndUpdate(req.user.id, { status:"inactive"});
   return res.status(200).json({
      status:true,
      user:user,
      message:"User account is disabled !!"
   });
});

exports.staffListing = catchAsync(async (req, res) => {
    let Query = new APIFeatures(User.find({
         role : 1,
        deletedAt : null || '',
    }), req.query ).sort();
    const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
    const data = await query;
    res.json({
      status: true,
      users: data,
      totalDocuments : totalDocuments,
      page : page,
      per_page : limit,
      totalPages : totalPages,
      message: data.length ? undefined : "No files found"
    });
});