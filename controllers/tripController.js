const Trip = require('../db/Trip');
const Order = require('../db/Order');
const User = require('../db/Users');
const DriverProfile = require('../db/DriverProfile');

function isRelayLoc(loc) {
    if (!loc) return false;
    return (loc.location_type && String(loc.location_type).toLowerCase() === 'relay') ||
           (loc.type && String(loc.type).toLowerCase() === 'relay');
}

function buildSegmentsFromOrder(orderDoc) {
    const locs = (orderDoc?.shipping_details?.[0]?.locations) || [];
    if (!Array.isArray(locs) || locs.length < 2) return [];
    const n = locs.length;
    const relayIdxs = [];
    for (let i = 0; i < n; i++) {
        if (isRelayLoc(locs[i]) && i > 0 && i < n) relayIdxs.push(i);
    }
    const bounds = [0, ...relayIdxs, n - 1];
    const uniq = bounds.filter((b, i, arr) => i === 0 || b !== arr[i - 1]);
    const segs = [];
    for (let i = 0; i < uniq.length - 1; i++) {
        const start = uniq[i];
        const end = uniq[i + 1];
        const startLoc = locs[start];
        const endLoc = locs[end];
        segs.push({
            start_stop_index: start,
            end_stop_index: end,
            start_location: `${startLoc?.location || startLoc?.address || ''}${startLoc?.city ? `, ${startLoc.city}` : ''}`,
            end_location: `${endLoc?.location || endLoc?.address || ''}${endLoc?.city ? `, ${endLoc.city}` : ''}`,
            miles: 0,
            totalDistance: 0,
            distance_unit: 'mi'
        });
    }
    return segs;
}

exports.splitOrder = async (req, res) => {
    try {
        const { orderId, segments } = req.body;
        const tenantId = req.user.tenantId;

        const order = await Order.findOne({ _id: orderId, tenantId });
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }

        // Remove existing trips for this order before re-splitting
        await Trip.deleteMany({ order: orderId, tenantId });
        
        const createdTrips = [];
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            
            // Get driver's current rate if not provided
            let rate = seg.rate_per_mile;
            if (!rate && seg.driver) {
                const profile = await DriverProfile.findOne({ user: seg.driver, tenantId });
                rate = profile?.ratePerMile || 0;
            }

            const trip = new Trip({
                tenantId,
                order: orderId,
                trip_no: i + 1,
                start_stop_index: seg.start_stop_index,
                end_stop_index: seg.end_stop_index,
                driver: seg.driver,
                truck: seg.truck,
                trailer: seg.trailer,
                carrier: seg.carrier,
                start_location: seg.start_location,
                end_location: seg.end_location,
                miles: Number(seg.miles || seg.totalDistance || 0),
                totalDistance: Number(seg.totalDistance || seg.miles || 0),
                distance_unit: seg.distance_unit || 'mi',
                rate_per_mile: rate || 0,
                notes: seg.notes,
                instructions: seg.instructions,
                created_by: req.user._id
            });
            
            await trip.save();
            createdTrips.push(trip);
        }

        res.json({
            status: true,
            message: 'Order split successfully into trips',
            trips: createdTrips
        });

    } catch (error) {
        console.error('Split Order Error:', error);
        res.status(500).json({ status: false, message: 'Server error during split' });
    }
};

exports.getOrderTrips = async (req, res) => {
    try {
        const { orderId } = req.params;
        const tenantId = req.user.tenantId;

        const trips = await Trip.find({ order: orderId, tenantId, deletedAt: null })
            .populate('driver', 'name email corporateID phone')
            .populate('truck', 'unitNumber plateNumber')
            .populate('trailer', 'unitNumber plateNumber')
            .populate('carrier', 'name mc_code phone email')
            .sort({ trip_no: 1 });

        res.json({ status: true, trips });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error fetching trips' });
    }
};

exports.updateTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const tenantId = req.user.tenantId;
        const updateData = req.body;

        const trip = await Trip.findOneAndUpdate(
            { _id: tripId, tenantId },
            { ...updateData, updatedAt: Date.now() },
            { new: true }
        );

        if (!trip) {
            return res.status(404).json({ status: false, message: 'Trip not found' });
        }

        res.json({ status: true, message: 'Trip updated successfully', trip });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error updating trip' });
    }
};

exports.getDriverTrips = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { from, to } = req.query;
        const tenantId = req.user.tenantId;
        const filter = { tenantId, driver: driverId, deletedAt: null };
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }
        const trips = await Trip.find(filter)
            .populate('order', 'serial_no totalDistance revenue_currency customer')
            .populate('truck', 'unitNumber')
            .populate('trailer', 'unitNumber')
            .sort({ createdAt: -1 });
        res.json({ status: true, trips });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error fetching driver trips' });
    }
};

exports.getDriverTripSummary = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { from, to } = req.query;
        const tenantId = req.user.tenantId;
        const match = { tenantId, driver: require('mongoose').Types.ObjectId(driverId), deletedAt: null };
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(from);
            if (to) match.createdAt.$lte = new Date(to);
        }
        const summary = await Trip.aggregate([
            { $match: match },
            { $group: {
                _id: null,
                totalTrips: { $sum: 1 },
                totalMiles: { $sum: { $ifNull: ['$miles', 0] } },
                totalKm: { $sum: { $ifNull: ['$total_km', 0] } },
                totalPay: { $sum: { $ifNull: ['$total_driver_pay', 0] } },
            } }
        ]);
        const byOrder = await Trip.aggregate([
            { $match: match },
            { $group: {
                _id: '$order',
                miles: { $sum: { $ifNull: ['$miles', 0] } },
                km: { $sum: { $ifNull: ['$total_km', 0] } },
                pay: { $sum: { $ifNull: ['$total_driver_pay', 0] } },
                trips: { $sum: 1 }
            } },
            { $sort: { trips: -1 } }
        ]);
        res.json({ status: true, summary: summary[0] || { totalTrips: 0, totalMiles: 0, totalKm: 0, totalPay: 0 }, byOrder });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error summarizing driver trips' });
    }
};

exports.getTruckTripSummary = async (req, res) => {
    try {
        const { truckId } = req.params;
        const { from, to } = req.query;
        const tenantId = req.user.tenantId;
        const match = { tenantId, truck: require('mongoose').Types.ObjectId(truckId), deletedAt: null };
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(from);
            if (to) match.createdAt.$lte = new Date(to);
        }
        const summary = await Trip.aggregate([
            { $match: match },
            { $group: {
                _id: null,
                totalTrips: { $sum: 1 },
                totalMiles: { $sum: { $ifNull: ['$miles', 0] } },
                totalKm: { $sum: { $ifNull: ['$total_km', 0] } }
            } }
        ]);
        const byOrder = await Trip.aggregate([
            { $match: match },
            { $group: {
                _id: '$order',
                miles: { $sum: { $ifNull: ['$miles', 0] } },
                km: { $sum: { $ifNull: ['$total_km', 0] } },
                trips: { $sum: 1 }
            } },
            { $sort: { trips: -1 } }
        ]);
        res.json({ status: true, summary: summary[0] || { totalTrips: 0, totalMiles: 0, totalKm: 0 }, byOrder });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error summarizing truck trips' });
    }
};

exports.deleteTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const tenantId = req.user.tenantId;

        const trip = await Trip.findOne({ _id: tripId, tenantId });
        if (!trip) {
            return res.status(404).json({ status: false, message: 'Trip not found' });
        }
        const order = await Order.findOne({ _id: trip.order, tenantId });
        if (!order) {
            return res.status(404).json({ status: false, message: 'Order not found' });
        }

        // Delete the selected trip first
        await Trip.deleteOne({ _id: tripId, tenantId });

        // Remove an adjacent relay location (boundary) so segments merge naturally
        let locs = order?.shipping_details?.[0]?.locations || [];
        let removedIndex = null;
        // Prefer removing the relay at this trip's start boundary (works for all except first segment)
        if (trip.start_stop_index > 0 && isRelayLoc(locs[trip.start_stop_index])) {
            removedIndex = trip.start_stop_index;
        } else if (trip.end_stop_index + 1 < locs.length && isRelayLoc(locs[trip.end_stop_index + 1])) {
            removedIndex = trip.end_stop_index + 1;
        }
        if (removedIndex !== null) {
            locs.splice(removedIndex, 1);
            order.shipping_details[0].locations = locs;
            await order.save();
        }

        // Rebuild segments based on remaining relay points
        const segments = buildSegmentsFromOrder(order);

        // Capture existing trips (except the deleted one) for assignment carry-over
        const existing = await Trip.find({ order: order._id, tenantId }).lean();

        // Remove all remaining trips to re-number cleanly
        await Trip.deleteMany({ order: order._id, tenantId });

        // Helper: choose best matching old trip by overlap of indices
        const chooseAssignment = (seg) => {
            let best = null;
            let bestScore = -1;
            for (const t of existing) {
                // overlap score: count of common indices
                const start = Math.max(t.start_stop_index, seg.start_stop_index);
                const end = Math.min(t.end_stop_index, seg.end_stop_index);
                const score = end >= start ? (end - start + 1) : 0;
                if (score > bestScore) {
                    bestScore = score;
                    best = t;
                }
            }
            return best;
        };

        const createdTrips = [];
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const match = chooseAssignment(seg);
            const rate =  match?.rate_per_mile || 0;
            const newTrip = new Trip({
                tenantId,
                order: order._id,
                trip_no: i + 1,
                start_stop_index: seg.start_stop_index,
                end_stop_index: seg.end_stop_index,
                driver: match?.driver || null,
                truck: match?.truck || null,
                trailer: match?.trailer || null,
                carrier: match?.carrier || null,
                start_location: seg.start_location,
                end_location: seg.end_location,
                miles: seg.miles || 0,
                totalDistance: seg.totalDistance || 0,
                distance_unit: seg.distance_unit || 'mi',
                rate_per_mile: rate,
                notes: match?.notes,
                instructions: match?.instructions,
                created_by: req.user._id
            });
            await newTrip.save();
            createdTrips.push(newTrip);
        }

        res.json({ status: true, message: 'Trip deleted, locations & trips updated', trips: createdTrips, removed_location_index: removedIndex });
    } catch (error) {
        console.error('Delete Trip Error:', error);
        res.status(500).json({ status: false, message: 'Server error deleting trip' });
    }
};
