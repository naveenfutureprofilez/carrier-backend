const User = require('../db/Users');
const DriverProfile = require('../db/DriverProfile');
const catchAsync = require('../utils/catchAsync');
const JSONerror = require('../utils/jsonErrorHandler');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

const createCorporateId = async () => {
  let corporateID;
  let isUnique = false;
  while (!isUnique) {
    corporateID = `DRID${Math.floor(100000 + Math.random() * 900000)}`;
    const existingUser = await User.findOne({ corporateID }, null, { includeInactive: true });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return corporateID;
};

exports.addDriver = catchAsync(async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ status: false, message: 'Tenant context is required' });
    }
    const {
      name, email, password, country, phone, address,
      ratePerMile, licenseNumber, licenseState, licenseExpiry,
      emails = [], phones = []
    } = req.body;

    if (!name || !email || !phone || !country || !address) {
      return res.status(400).json({ status: false, message: 'Missing required fields' });
    }

    const isEmailUsed = await User.findOne({ email, tenantId }, null, { includeInactive: true });
    if (isEmailUsed) {
      return res.json({ status: false, message: 'Your given email address is already used.' });
    }

    const corporateID = await createCorporateId();
    const hashedPassword = await bcrypt.hash(password || Math.random().toString(36).slice(2), 12);

    const user = await User.create({
      name,
      email,
      corporateID,
      created_by: req.user?._id,
      password: hashedPassword,
      country,
      phone,
      address,
      role: 0,
      company: req.user?.company ? req.user.company._id : null,
      position: 'Driver',
      tenantId
    });

    const normalizedEmails = [];
    if (email) normalizedEmails.push({ email, is_primary: true });
    (Array.isArray(emails) ? emails : []).forEach(e => {
      if (e && e !== email) normalizedEmails.push({ email: e, is_primary: false });
    });

    const normalizedPhones = [];
    if (phone) normalizedPhones.push({ phone, is_primary: true });
    (Array.isArray(phones) ? phones : []).forEach(p => {
      if (p && p !== phone) normalizedPhones.push({ phone: p, is_primary: false });
    });

    const profile = await DriverProfile.create({
      tenantId,
      user: user._id,
      emails: normalizedEmails,
      phones: normalizedPhones,
      ratePerMile: Number(ratePerMile) || 0,
      licenseNumber,
      licenseState,
      licenseExpiry,
      createdBy: req.user?._id
    });

    user.password = undefined;
    return res.status(201).json({
      status: true,
      message: 'Driver created successfully',
      user,
      profile
    });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});

exports.driversLists = catchAsync(async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ status: false, message: 'Tenant context is required', lists: [] });
    }
    const companyId = req.user?.company ? req.user.company._id : null;
    const filter = { tenantId, role: 0 };
    if (companyId) {
      filter.company = companyId;
    }
    const users = await User.find(filter, null, { includeInactive: true })
      .select('name email status role tenantId createdAt position phone country address corporateID created_by')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map(u => u._id);
    const profiles = await DriverProfile.find({ tenantId, user: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map(p => [String(p.user), p]));

    const lists = users.map(u => ({
      ...u,
      driverProfile: profileMap.get(String(u._id)) || null
    }));

    return res.status(200).json({
      status: true,
      lists,
      totalDocuments: lists.length
    });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});

exports.removeDriver = catchAsync(async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ status: false, message: 'Tenant context is required' });
    }
    const companyId = req.user?.company ? req.user.company._id : null;
    const id = req.params.id;
    const filter = { _id: id, tenantId, role: 0 };
    if (companyId) {
      filter.company = companyId;
    }
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ status: false, message: 'Driver not found' });
    }
    user.deletedAt = new Date();
    user.status = 'inactive';
    await user.save({ validateBeforeSave: false });
    await DriverProfile.findOneAndUpdate({ tenantId, user: user._id }, { deletedAt: new Date() });
    return res.json({ status: true, message: 'Driver removed (soft delete)', userId: user._id });
  } catch (err) {
    JSONerror(res, err, next);
    logger(err);
  }
});
