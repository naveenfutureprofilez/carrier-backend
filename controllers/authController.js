const User = require("../db/Users");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const {promisify} = require("util");
const AppError = require("../utils/AppError");
const SendEmail = require("../utils/Email");

const crypto = require("crypto");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");
const SECRET_ACCESS = process.env && process.env.SECRET_ACCESS || "MYSECRET";
const bcrypt = require('bcrypt');
const Company = require("../db/Company");
const EmployeeDoc = require("../db/EmployeeDoc");
const Tenant = require("../db/Tenant");
const SuperAdmin = require("../db/SuperAdmin");

const signToken = async (id) => {
  const token = jwt.sign(
    {id}, 
    SECRET_ACCESS, 
    {expiresIn:'14400m'}
  );
  return token
}

const validateToken = catchAsync ( async (req, res, next) => {
  // First check for JWT in cookies (preferred for security)
  let token = req.cookies?.jwt;
  
  // Fallback to Authorization header for backward compatibility
  if (!token) {
    let authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }
  }
  
  if (!token) {
    return res.status(401).json({
      status: false,
      message: "User is not authorized or Token is missing",
    });
  }
  
  try {
    const decode = await promisify(jwt.verify)(token, SECRET_ACCESS);
    if (decode) {
      let result = await User.findById(decode.id).populate('company');
      if (!result) {
        return res.status(401).json({
          status: false,
          message: 'User not found',
        });
      }
      console.log("result", result);
      req.user = result;
      next();
    } else {
      res.status(401).json({
        status: false,
        message: 'Unauthorized',
      });
    }
  } catch (err) {
    res.status(401).json({
      status: false,
      message: 'Invalid or expired token',
      error: err
    });
  }
});
  
const editUser = catchAsync(async (req, res, next) => {
  if(req.user && req.user.is_admin !== 1){
    return res.json({
      status : false,
      message : "You are not authorized to access this route."
    });
  }

  // Prevent client from setting tenantId
  if ('tenantId' in req.body) {
    delete req.body.tenantId;
  }

  // Get tenant context
  const tenantIdFromContext = req.tenantId || req.user?.tenantId;
  
  // Find user within tenant context - include inactive users
  const filter = { _id: req.params.id };
  if (tenantIdFromContext) {
    filter.tenantId = tenantIdFromContext;
  }
  
  const existedUser = await User.findOne(filter, null, { includeInactive: true });
  
  if (!existedUser) {
    return res.json({
      status : false,
      message : "User not found or access denied."
    });
  }
  
  if(req.body.email !== existedUser?.email){
    // Check if new email is already in use within tenant
    const emailExists = await User.findOne({ 
      email: req.body.email, 
      tenantId: tenantIdFromContext,
      _id: { $ne: req.params.id }
    }, null, { includeInactive: true });
    
    if (emailExists) {
      return res.json({
        status : false,
        message : "Your given email address is already used."
      });
    }
  } 
  
  try {
    const result = await User.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      email: req.body.email, 
      staff_commision : req.body.role === 1 ? req.body.staff_commision : null,
      country: req.body.country,
      phone: req.body.phone,
      position: req.body.position,
      address: req.body.address,
      role: req.body.role,
      // tenantId is intentionally NOT included - cannot be changed after creation
    }, { new: true, includeInactive: true });
    
    result.password = undefined;
    res.send({
      status: true,
      user: result,
      message: "User has been updated.",
    });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});

const suspandUser = catchAsync(async (req, res, next) => {
  if(req.user && req.user.is_admin !== 1){
    return res.json({
      status : false,
      message : "You are not authorized to access this route."
    });
  }
  
  // Get tenant context for security
  const tenantIdFromContext = req.tenantId || req.user?.tenantId;
  
  // Build filter with tenant context
  const filter = { _id: req.params.id };
  if (tenantIdFromContext) {
    filter.tenantId = tenantIdFromContext;
  }
  
  // Include inactive users in the search
  const existedUser = await User.findOne(filter, null, { includeInactive: true });
  
  if (!existedUser) {
    return res.json({
      status: false,
      message: "User not found or access denied."
    });
  }
  
  const newStatus = existedUser.status === 'active' ? 'inactive' : 'active';
  const actionMessage = existedUser.status === 'active' ? 'suspended' : 'reactivated';
  
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { status: newStatus },
      { new: true, includeInactive: true }
    );
    
    if (updatedUser) {
      updatedUser.password = undefined;
    }
    
    res.send({
      status: true,
      user: updatedUser,
      message: `User account has been ${actionMessage}.`,
    });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});

const signup = catchAsync(async (req, res, next) => {
  // Extract fields and explicitly exclude tenantId from body
  const { role, name, email, avatar, password, generateAutoPassword, staff_commision, position, country, phone, address } = req.body;
  
  // Prevent client from setting tenantId
  if ('tenantId' in req.body) {
    delete req.body.tenantId;
  }
  
  // Authorization check
  if(req.user && req.user.is_admin !== 1){
    return res.json({
      status : false,
      message : "You are not authorized to create user."
    });
  }

  // Get tenant context from authenticated user
  const creator = req.user;
  const tenantIdFromContext = req.tenantId || (creator && creator.tenantId);

  // Debug logging for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 signup tenant context:', {
      userId: creator?._id?.toString(),
      userEmail: creator?.email,
      reqTenantId: req.tenantId,
      userTenantId: creator?.tenantId,
      tenantIdFromContext
    });
  }

  // Require tenant context
  if (!tenantIdFromContext) {
    return res.status(400).json({
      status: false,
      message: "Tenant context is required to create an employee"
    });
  }

  // Check if email is already used within the same tenant
  const isEmailUsed = await User.findOne({ email: email, tenantId: tenantIdFromContext }, null, { includeInactive: true });
  let generatedPassword = password || '';
  if(generateAutoPassword === 1){
    generatedPassword = crypto.randomBytes(10).toString('hex');
  }

  if(isEmailUsed){
    return res.json({
      status : false,
      message : "Your given email address is already used."
    });
  }

  // Generate unique corporate ID
  let corporateID;
  let isUnique = false;
  while (!isUnique) {
    corporateID = `CCID${Math.floor(100000 + Math.random() * 900000)}`;
    const existingUser = await User.findOne({ corporateID }, null, { includeInactive: true });
    if (!existingUser) {
      isUnique = true;
    }
  }

  await User.syncIndexes();
  
  try {
    const result = await User.create({
      name: name,
      email: email, 
      staff_commision : role === 1 ? staff_commision : null,
      avatar: avatar || '',
      corporateID: corporateID,
      created_by: creator && creator._id,
      password: generatedPassword,
      country: country,
      phone: phone,
      address: address,
      role: role,
      company: creator && creator.company ? creator.company._id : null,
      position: position,
      confirmPassword: generatedPassword,
      tenantId: tenantIdFromContext // Explicitly set tenant ID from context
    });
    
    // Debug logging for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ User created successfully:', {
        userId: result._id?.toString(),
        email: result.email,
        tenantId: result.tenantId,
        createdBy: result.created_by?.toString()
      });
    }
    
    result.password = undefined;
    res.send({
      status: true,
      generatedUser : {
        name: name,
        generatedPassword: generatedPassword,
        email: email,
        role : role,
        corporateID: corporateID
      },
      user: result,
      message: "User has been created.",
    });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});
 
const login = catchAsync ( async (req, res, next) => { 
   const { email, password, tenantId } = req.body;
   if(!email || !password){
      return next(new AppError("Email and password is required !!", 401))
   }
   if(!tenantId){
      return next(new AppError("Tenant ID is required !!", 401))
   }
    const user = await User.findOne({ email, tenantId }).select('+password').lean();
    
    if (!user) {
        return res.status(200).json({ status: false, message: "Invalid Details" });
    } 

    if (user.status === 'inactive') {
        return res.status(200).json({ status: false, message: "Your account is suspended!" });
    }
    const pp= await bcrypt.compare(password, user.password)
    console.log("await bcrypt.compare(password", pp);

   if(!user || !(await bcrypt.compare(password, user.password))){
    res.status(200).json({
      status : false, 
      message:"Details are invalid.",
     });   
   }

   const token = await signToken(user._id);
  //  res.cookie('jwt', token, {
  //   expires:new Date(Date.now() + 30*24*60*60*1000),
  //   httpOnly:true,
  //  });
   res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use true in production (HTTPS)
    sameSite: 'Strict', // or 'Lax' for less strict
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  user.password = undefined;
  user.confirmPassword = undefined;
   res.status(200).json({
    status :true,
    message:"Login Successfully !!",
    user : user,
    token
   });
});

const profile = catchAsync ( async (req, res) => {
  if (!req.user) {
    return res.status(200).json({
      status: false,
      message: "Unauthorized",
    });
  }

  const isSuperAdmin = req.isSuperAdminUser || req.superAdmin;
  const isEmulating = req.isEmulating && req.tenantId;
  
  let userProfile = {
    _id: req.user._id,
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    status: req.user.status || 'active',
    role: req.user.role,
    corporateID: req.user.corporateID,
    is_admin: req.user.is_admin,
    position: req.user.position,
    phone: req.user.phone,
    country: req.user.country,
    address: req.user.address,
    avatar: req.user.avatar,
    createdAt: req.user.createdAt
  };

  // Handle superadmin emulation
  if (isSuperAdmin && isEmulating) {
    // Show superadmin's actual details with emulation context
    userProfile.name = `${req.user.name} (Emulating)`;
    userProfile.userType = 'super_admin_emulating';
    userProfile.status = 'active'; // Superadmin is always active during emulation
    userProfile.isEmulating = true;
    userProfile.emulatedTenantId = req.tenantId;
    
    // Add tenant context if available
    if (req.tenant) {
      userProfile.emulatingTenant = {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name
      };
    }
  } else if (isSuperAdmin) {
    userProfile.userType = 'super_admin';
  } else {
    userProfile.userType = 'tenant_user';
    userProfile.tenantId = req.user.tenantId;
  }

  // Find company for the current tenant context
  const filter = {};
  if (req.tenantId) {
    filter.tenantId = req.tenantId;
  } else if (req.user.tenantId) {
    filter.tenantId = req.user.tenantId;
  }
  
  const company = await Company.findOne(filter);
  
  res.status(200).json({
    status: true,
    user: userProfile,
    company: company,
  });
});

const employeesLisiting = catchAsync ( async (req, res) => {
  // Get tenant ID from request context (prefer req.tenantId from tenant resolver)
  const tenantId = req.tenantId || req.user?.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({
      status: false,
      message: "Tenant context is required",
      lists: [],
      totalDocuments: 0
    });
  }
  
  // Build filter using tenant context and exclude admins
  const baseFilter = { 
    tenantId: tenantId,
    is_admin: { $ne: 1 } // Exclude admin users from employee listing
  };
  
  // If dbFilter from tenantDataFilter middleware exists, merge it
  if (req.dbFilter) {
    Object.assign(baseFilter, req.dbFilter);
  }
  
  // Debug logging for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 employeesListing context:', {
      userId: req.user?._id?.toString(),
      userEmail: req.user?.email,
      reqTenantId: req.tenantId,
      userTenantId: req.user?.tenantId,
      finalTenantId: tenantId,
      filter: JSON.stringify(baseFilter)
    });
  }
  
  try {
    // Use Mongoose query with proper filtering - include inactive users
    const employees = await User.find(baseFilter, null, { includeInactive: true })
      .select('name email status role tenantId createdAt position phone country address corporateID created_by')
      .sort({ createdAt: -1 })
      .lean();
    
    const totalDocuments = employees.length;
    
    // Debug logging for development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Found ${totalDocuments} employees for tenant "${tenantId}"`);
      if (employees.length > 0) {
        console.log('First few employees:', employees.slice(0, 3).map(emp => ({ 
          name: emp.name, 
          email: emp.email, 
          tenantId: emp.tenantId 
        })));
      }
    }
    
    res.status(200).json({
      status: true,
      lists: employees,
      totalDocuments: totalDocuments
    });
  } catch (error) {
    console.error('Error in employeesListing:', error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch employees",
      lists: [],
      totalDocuments: 0
    });
  }
});

const employeeDetail = catchAsync ( async (req, res) => {
  const employeeId = req.params.id;
  
  // Validate employee ID
  if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
    return res.status(400).json({
      status: false,
      message: "Valid employee ID is required.",
      employee: null
    });
  }
  // Check if employeeId is a valid ObjectId
  if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      status: false,
      message: "Invalid employee ID format.",
      employee: null
    });
  }
  const employee = await User.findById(employeeId, null, { includeInactive: true }).populate('company');
  
  if (!employee) {
    return res.status(404).json({
      status: false,
      message: "Employee not found.",
      employee: null
    });
  }
  
  // Remove sensitive information
  employee.password = undefined;
  employee.confirmPassword = undefined;
  
  res.status(200).json({
    status: true,
    employee: employee,
  });
});

const employeesDocs = catchAsync ( async (req, res) => {
  const employeeId = req.params.id;
  
  // Validate employee ID
  if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
    return res.status(400).json({
      status: false,
      message: "Valid employee ID is required.",
      documents: []
    });
  }
  
  // Check if employeeId is a valid ObjectId
  if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      status: false,
      message: "Invalid employee ID format.",
      documents: []
    });
  }
  
  const documents = await EmployeeDoc.find({ user: employeeId }).populate('added_by').sort({ createdAt: -1 });
  console.log("documents", documents);
  
  res.status(200).json({
    status: true,
    documents: documents || [],
  });
});

const forgotPassword = catchAsync ( async (req, res, next) => {
  const user = await User.findOne({email:req.body.email}, null, { includeInactive: true });
  if(!user){
    res.json({
      status:false,
      message:"No user found associated with this email.",
    }); 
  } 
  const resetToken = await user.createPasswordResetToken();
  await user.save({validateBeforeSave:false});
  const resetTokenUrl = `${process.env.DOMAIN_URL}/user/resetpassword/${resetToken}`;
  const message = `<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
  <meta name="format-detection" content="telephone=no" />

  <style>
    body{margin:0;padding:0;min-width:100%;width:100% !important;height:100% !important;}
body,table,td,div,p,a{-webkit-font-smoothing:antialiased;text-size-adjust:100%;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;line-height:100%;}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse !important;border-spacing:0;}
img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
#outlook a{padding:0;}
.ReadMsgBody{width:100%;}
.ExternalClass{width:100%;}
.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div{line-height:100%;}
@media all and (min-width:560px){body{margin-top:30px;}
}
/* Rounded corners */
 @media all and (min-width:560px){.container{border-radius:8px;-webkit-border-radius:8px;-moz-border-radius:8px;-khtml-border-radius:8px;}
}
/* Links */
 a,a:hover{color:#127DB3;}
.footer a,.footer a:hover{color:#999999;}

  </style>
  <title>🔒 Reset Your Password</title>
</head>

<!-- BODY -->
<body topmargin="0" rightmargin="0" bottommargin="0" leftmargin="0" marginwidth="0" marginheight="0" width="100%" style="border-collapse: collapse; border-spacing: 0;  padding: 0; width: 100%; height: 100%; -webkit-font-smoothing: antialiased; text-size-adjust: 100%; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; line-height: 100%;
	background-color: #ffffff;
	color: #000000;" bgcolor="#ffffff" text="#000000">
  <table width="100%" align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; width: 100%;" class="background">
    <tr>
      <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0;" bgcolor="#ffffff">
        <table border="0" cellpadding="0" cellspacing="0" align="center" bgcolor="#FFFFFF" width="560" style="border-collapse: collapse; border-spacing: 0; padding: 0; width: inherit;
	max-width: 560px;" class="container">
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%; font-size: 24px; font-weight: bold; line-height: 130%;padding-top: 25px;color: #000000;font-family: sans-serif;" class="header">
              <img border="0" vspace="0" hspace="0" src="https://runstream.co/logo-white.png" style="max-width: 250px;" alt="The Idea" title="Runstream" />
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%;
			padding-top: 25px;" class="line">
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%; font-size: 17px; font-weight: 400; line-height: 160%;
			padding-top: 25px; 
			color: #000000;
			font-family: sans-serif;" class="paragraph">
              Hi ${user.name || ""},<br> We received a request to reset your password for your runstream account. No worries, it happens to the best of us!
              <br>
              To reset your password, please click the button below:
              <br>
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%; padding-top: 25px;padding-bottom: 5px;" class="button">
                <table border="0" cellpadding="0" cellspacing="0" align="center" style=" min-width: 120px; border-collapse: collapse; border-spacing: 0; padding: 0;">
                  <tr>
                    <td align="center" valign="middle" style="border-collapse: collapse;"  >
                      <a target="_blank" style="padding: 12px 24px; margin: 0; border-collapse: collapse; text-decoration: none; border-spacing: 0; border-radius: 10px; -webkit-border-radius: 10px; -moz-border-radius: 10px; -khtml-border-radius: 10px; background: #df3939; text-decoration: none; max-width: 240px;
                        color: #FFFFFF; font-family: sans-serif; font-size: 17px; font-weight: 400; line-height: 120%;"  href=${resetTokenUrl}>
                          Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%;
			padding-top: 25px;" class="line">
            </td>
          </tr>
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%; font-size: 17px; font-weight: 400; line-height: 160%;
			padding-top: 20px;
			padding-bottom: 25px;
			color: #000000;
			font-family: sans-serif;" class="paragraph">
              If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:Support@runstream.co" target="_blank" style=" color: #4b57ff; ">support@runstream.co</a>. We’re here to help!. 
            </td>
          </tr>
        </table>
        <table border="0" cellpadding="0" cellspacing="0" align="center" width="560" style="border-collapse: collapse; border-spacing: 0; padding: 0; width: inherit;
	max-width: 560px;" class="wrapper">
          <tr>
            <td align="center" valign="top" style="border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; padding-left: 6.25%; padding-right: 6.25%; width: 87.5%; font-size: 13px; font-weight: 400; line-height: 150%;
			padding-top: 20px;
			padding-bottom: 20px;
			color: #999999;
			font-family: sans-serif;" class="footer">
              For more information <a href="https://runstream.co/contact" target="_blank" style=" color: #999999; ">contact us</a>. Our support
              team is available to help you 24 hours a day, seven days a week.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  try {
    const send = await SendEmail({
      email:user.email,
      subject:"🔒 Reset Your Password",
      message
    });
    console.log('send', send);
    res.status(200).json({
      status:true,
      message:"Password Reset link sent your email address."
    })
  } catch (err){
    console.log("err",err)
    user.passwordResetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save({ validateBeforeSave:false });
    next(
      res.status(200).json({
        status:false,
        message:"Failed to reset your password. Please try again later."
      })
    )
  }
});

const resetpassword = catchAsync ( async (req, res, next) => {
  if(req.body.password !== req.body.confirmPassword){ 
    res.json({
      status:false,
      message:"Confirm password is incorrect. Please try again later.",
    }); 
  }
  const hashToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken:hashToken,
    resetTokenExpire : { $gt: Date.now()}
  });
  if(!user){ 
    res.json({
      status:false,
      message:"Link expired or invalid token.",
    }); 
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.resetTokenExpire = undefined;
  await user.save({validateBeforeSave:false});
  res.json({
    status:true,
    message:"Password changed successfully.",
  }); 
});

const addCompanyInfo = catchAsync ( async (req, res, next) => {
  const {name, email, phone, address, companyID, bank_name, account_name, account_number, routing_number, remittance_primary_email, remittance_secondary_email, rate_confirmation_terms} = req.body;
  if(companyID){
    // Find company by ID and ensure it belongs to the current tenant
    const filter = { _id: companyID };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    const existing = await Company.findOne(filter);
    if(existing){
      existing.name = name !== '' && name !== undefined ? name : existing.name;
      existing.email = email !== '' && email !== undefined ? email : existing.email;
      existing.address = address  !== '' && address !== undefined ? address : existing.address;
      existing.phone = phone !== '' && phone !== undefined ? phone : existing.phone;
      existing.bank_name = bank_name !== '' && bank_name !== undefined ? bank_name : existing.bank_name;
      existing.account_name = account_name !== '' && account_name !== undefined ? account_name : existing.account_name;
      existing.account_number = account_number !== '' && account_number !== undefined ? account_number : existing.account_number;
      existing.routing_number = routing_number !== '' && routing_number !== undefined ? routing_number : existing.routing_number;
      existing.remittance_primary_email = remittance_primary_email !== '' && remittance_primary_email !== undefined ? remittance_primary_email : existing.remittance_primary_email;
      existing.remittance_secondary_email = remittance_secondary_email !== '' && remittance_secondary_email !== undefined ? remittance_secondary_email : existing.remittance_secondary_email;
      existing.rate_confirmation_terms = rate_confirmation_terms !== '' && rate_confirmation_terms !== undefined ? rate_confirmation_terms : existing.rate_confirmation_terms;
      await existing.save();
      return res.send({
        status: true,
        company :existing,
        message: "Details has been updated.",
      });
    }
  }
  await Company.syncIndexes();
  Company.create({
    name: name,
    email: email,
    address: address,
    phone: phone,
    bank_name: bank_name,
    account_name: account_name,
    account_number: account_number,
    routing_number: routing_number,
    remittance_primary_email: remittance_primary_email,
    remittance_secondary_email: remittance_secondary_email,
    rate_confirmation_terms: rate_confirmation_terms,
    tenantId: req.tenantId || 'default-tenant',
  }).then(result => {
    res.send({
      status: true,
      company :result,
      message: "Details has been updated.",
    });
  }).catch(err => {
    JSONerror(res, err, next);
    logger(err);
  });
});

const changePassword = async (req, res) => {
    try {
        const { id, password } = req.body;

        // 1. Find the user with password field included
        const user = await User.findById(id).select('+password');
        if (!user) return res.status(200).json({ 
          status: false,
          message: 'User not found.' 
        });

        // // 2. Check if current password matches
        // const isMatch = await user.checkPassword(password, user.password);
        // if (!isMatch) return res.status(401).json({ 
        //   status: false,
        //   message: 'Current password is incorrect.'
        // });

        user.password = password;
        user.changedPasswordAt = Date.now();
        await user.save();

        res.status(200).json({ 
          status:true,
          message: 'Password updated successfully.'
         });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 
          status:false,
          message: 'Server error.'
         });
    }
};

const logout = catchAsync(async (req, res) => {
  // Clear the JWT cookie
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
    httpOnly: true,
  });
  
  res.status(200).json({
    status: true,
    message: 'Logged out successfully !!!'
  });
});


/**
 * Test debug endpoint
 */
const debugTest = (req, res) => {
  console.log('🚨 DEBUG TEST ENDPOINT CALLED');
  res.json({ debug: 'working', timestamp: new Date() });
};

/**
 * Test Super Admin Login
 */
const testSuperAdminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  console.log('🗺 TEST SUPER ADMIN LOGIN CALLED');
  console.log('- email:', email);
  console.log('- password length:', password?.length);
  
  try {
    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    console.log('👤 SuperAdmin found:', !!superAdmin);
    
    if (!superAdmin) {
      return res.json({ status: false, message: 'SuperAdmin not found', debug: true });
    }
    
    const passwordMatch = await bcrypt.compare(password, superAdmin.password);
    console.log('🔑 Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return res.json({ status: false, message: 'Password does not match', debug: true });
    }
    
    if (superAdmin.status !== 'active') {
      return res.json({ status: false, message: 'SuperAdmin not active', debug: true });
    }
    
    const token = await signToken(superAdmin.userId);
    const user = await User.findById(superAdmin.userId).populate('company');
    
    res.json({
      status: true,
      message: 'Test super admin login successful!',
      debug: true,
      superAdmin: {
        name: superAdmin.name,
        email: superAdmin.email,
        status: superAdmin.status
      },
      user: user ? {
        name: user.name,
        email: user.email,
        role: user.role
      } : null,
      hasToken: !!token
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.json({ status: false, message: 'Error occurred', error: error.message, debug: true });
  }
});

/**
 * Multi-tenant login - handles both regular users and super admins
 */
const multiTenantLogin = catchAsync(async (req, res, next) => {
  const { email, password, tenantId, isSuperAdmin } = req.body;
  
  if (!email || !password) {
    console.log('❌ Missing email or password');
    return next(new AppError("Email and password are required!", 400));
  }
  
  try {
    // First, try to find super admin by email
    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    
    if (superAdmin) {
      console.log('🔍 Found super admin with email:', email);
      
      const isPasswordValid = await superAdmin.checkPassword(password, superAdmin.password);
      if (!isPasswordValid) {
        console.log('❌ Super admin password invalid');
        return res.status(200).json({
          status: false,
          message: "Invalid credentials"
        });
      }
      
      if (superAdmin.status !== 'active') {
        console.log('❌ Super admin account inactive');
        return res.status(200).json({
          status: false,
          message: "Account is inactive"
        });
      }
      
      // Create JWT token with the user ID (not superAdmin ID)
      const token = await signToken(superAdmin.userId);
      
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Get the actual user record
      const user = await User.findById(superAdmin.userId).populate('company');
      user.password = undefined;
      
      // Update super admin's last login
      superAdmin.lastLogin = new Date();
      await superAdmin.save({ validateBeforeSave: false });
      
      return res.status(200).json({
        status: true,
        message: "Login successful!",
        user,
        isSuperAdmin: true,
        token,
        redirectTo: "/super-admin"
      });
    }
    
    // If not super admin, try to find tenant user
    console.log('🔍 Not super admin, searching for tenant user with email:', email);
    
    // If tenantId is provided (backward compatibility), use it
    if (tenantId) {
      console.log('🔍 Using provided tenantId:', tenantId);
    } else {
      // Auto-detect tenant from user email - find any user with this email
      console.log('🔍 Auto-detecting tenant from user email...');
      const userWithEmail = await User.findOne({ email }).select('+password').populate('company');
      
      if (!userWithEmail) {
        console.log('❌ No user found with email:', email);
        return res.status(200).json({
          status: false,
          message: "Invalid credentials"
        });
      }
      
      console.log('✅ Found tenant user, using tenantId:', userWithEmail.tenantId);
      // Use the user's tenantId for tenant validation
      req.body.tenantId = userWithEmail.tenantId;
    }
    
    const finalTenantId = tenantId || req.body.tenantId;
    
    console.log('🔍 Looking up tenant with tenantId:', finalTenantId);
    
    // First, let's see what tenants exist in the database
    const allTenants = await Tenant.find({});
    console.log('📊 All tenants in database:');
    allTenants.forEach((t, index) => {
      console.log(`  ${index + 1}. tenantId: "${t.tenantId}" (${typeof t.tenantId}), status: "${t.status}", name: "${t.name}", subdomain: "${t.subdomain}"`);
    });
    
    // Check if we can find the tenant without status filter first
    let tenantAny = await Tenant.findOne({ tenantId: finalTenantId });
    console.log('🔎 Tenant lookup by tenantId without status filter:', tenantAny ? 'FOUND' : 'NOT FOUND');
    
    // If not found by tenantId, try by subdomain (for backward compatibility)
    if (!tenantAny) {
      console.log('🔎 Tenant not found by tenantId, trying subdomain lookup...');
      tenantAny = await Tenant.findOne({ subdomain: finalTenantId });
      console.log('🔎 Tenant lookup by subdomain:', tenantAny ? 'FOUND' : 'NOT FOUND');
      
      if (tenantAny) {
        console.log('ℹ️ Found tenant by subdomain - this means frontend is using subdomain as tenantId');
        console.log('   Using actual tenantId for further processing:', tenantAny.tenantId);
      }
    }
    
    if (tenantAny) {
      console.log('   Found tenant details:', {
        tenantId: tenantAny.tenantId,
        name: tenantAny.name,
        status: tenantAny.status,
        subdomain: tenantAny.subdomain
      });
    }
    
    // Now try with the status filter using the resolved tenant
    console.log('🔎 Attempting tenant lookup with status filter: { $in: ["active", "trial"] }');
    const actualTenantId = tenantAny ? tenantAny.tenantId : tenantId;
    console.log('🔍 Using actualTenantId for status lookup:', actualTenantId);
    
    const tenant = await Tenant.findOne({ 
      tenantId: actualTenantId, 
      status: { $in: ['active'] } 
    });
    
    console.log('🔍 Tenant lookup result:', tenant ? 'FOUND' : 'NOT FOUND');
    if (tenant) {
      console.log('✅ Tenant found:', {
        tenantId: tenant.tenantId,
        name: tenant.name,
        status: tenant.status,
        subdomain: tenant.subdomain
      });
    }
    
    if (!tenant) {
      console.log('❌ Tenant not found or inactive - returning error');
      console.log('🔍 Debug: Looking for exact tenantId match...');
      
      // Try different search variations
      const exactMatch = await Tenant.findOne({ tenantId: tenantId });
      const trimmedMatch = await Tenant.findOne({ tenantId: tenantId?.trim() });
      const regexMatch = await Tenant.findOne({ tenantId: { $regex: new RegExp(tenantId, 'i') } });
      
      console.log('🔍 Exact match result:', exactMatch ? 'FOUND' : 'NOT FOUND');
      console.log('🔍 Trimmed match result:', trimmedMatch ? 'FOUND' : 'NOT FOUND');
      console.log('🔍 Regex match result:', regexMatch ? 'FOUND' : 'NOT FOUND');
      
      return res.status(200).json({
        status: false,
        message: "Company not found or inactive"
      });
    }
    
    // Find user within the tenant
    console.log('👤 Looking up user with email:', email, 'and actualTenantId:', actualTenantId);
    
    // First check all users with this email
    const allUsersWithEmail = await User.find({ email });
    console.log('📋 All users with this email:', allUsersWithEmail.length);
    allUsersWithEmail.forEach((u, index) => {
      console.log(`  ${index + 1}. email: "${u.email}", tenantId: "${u.tenantId}", corporateId: "${u.corporateId}", status: "${u.status}"`);
    });
    
    const user = await User.findOne({ 
      email, 
      tenantId: actualTenantId 
    }).select('+password').populate('company');
    
    console.log('👤 User lookup result:', user ? 'FOUND' : 'NOT FOUND');
    if (user) {
      console.log('✅ User found:', {
        email: user.email,
        tenantId: user.tenantId,
        corporateId: user.corporateId,
        status: user.status,
        role: user.role,
        is_admin: user.is_admin
      });
    }
    
    if (!user) {
      console.log('❌ User not found - returning invalid credentials');
      return res.status(200).json({
        status: false,
        message: "Invalid credentials"
      });
    }
    
    if (user.status === 'inactive') {
      console.log('❌ User account is inactive');
      return res.status(200).json({
        status: false,
        message: "Your account is suspended!"
      });
    }
    
    console.log('🔓 Checking password for user');
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('🔓 Password match result:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match - returning invalid credentials');
      return res.status(200).json({
        status: false,
        message: "Invalid credentials"
      });
    }
    
    console.log('🎉 All validations passed - generating token');
    const token = await signToken(user._id);
    console.log('📝 Token generated successfully');
    
    // Set cookie with proper configuration for cross-origin requests
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // Allow cross-origin in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.logistikore.com' : undefined // Allow subdomain sharing
    });
    
    console.log('🍪 Cookie set with config:', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: '7 days',
      domain: process.env.NODE_ENV === 'production' ? '.logistikore.com' : 'none'
    });
    
    user.password = undefined;
    
    console.log('✅ MULTITENANT LOGIN SUCCESS - Returning success response');
    console.log('🔐 MULTITENANT LOGIN DEBUGGING END');
    
    res.status(200).json({
      status: true,
      message: "Login successful!",
      user,
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        subdomain: tenant.subdomain
      },
      token,
      redirectTo: "/home"
    });
    
  } catch (error) {
    console.error('❌ MULTITENANT LOGIN ERROR:', error);
    console.error('❌ Stack trace:', error.stack);
    console.log('🔐 MULTITENANT LOGIN DEBUGGING END (ERROR)');
    return res.status(500).json({
      status: false,
      message: "Login failed. Please try again."
    });
  }
});

module.exports = { changePassword, addCompanyInfo, suspandUser, editUser, employeesLisiting, signup, login, multiTenantLogin, validateToken, profile, forgotPassword, resetpassword, employeesDocs, employeeDetail, logout, debugTest, testSuperAdminLogin };
