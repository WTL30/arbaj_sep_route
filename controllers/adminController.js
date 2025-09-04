// const bcrypt = require('bcrypt');
// const jwt = require("jsonwebtoken");
// const { Admin } = require("../models");
// const Cab = require("../models/CabAssignment");
// const {Driver} = require("../models");
// const CabDetails = require("../models/CabsDetails");
// require("dotenv").config();
// const Expense = require("../models/subAdminExpenses");
// const Analytics = require("../models/SubadminAnalytics");
// const nodemailer = require("nodemailer");
// const crypto = require('crypto');

// // const Expense = require("../models/Expense");

// //  Configure Nodemailer
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// const addNewSubAdmin = async (req, res) => {
//   try {
//     const { name, email, role, phone, status, companyInfo } = req.body;
//     console.log("response", req.body);

//     const profileImage = req.files?.profileImage?.[0]?.path || null;
//     const companyLogo = req.files?.companyLogo?.[0]?.path || null;
//     const signature = req.files?.signature?.[0]?.path || null;

//     // Basic validation
//     if (!name || !email || !role || !phone || !companyInfo) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be provided.",
//       });
//     }

//     // Check for existing email
//     // const existingSubAdmin = await Admin.findOne({ where: { email } });
//     const existingSubAdmin = await Admin.findOne({ where: { email } });

//     if (existingSubAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already in use",
//       });
//     }

//     // Generate and hash password
//     const generatedPassword = Math.random().toString(36).slice(-8);
//     // const hashedPassword = await bcrypt.hash(generatedPassword, 10);

//     // Create subadmin
//     const newSubAdmin = await Admin.create({
//       profileImage,
//       name,
//       email,
//       password: generatedPassword,
//       role,
//       phone,
//       status: status || "Active",
//       companyLogo,
//       companyInfo,
//       signature,
//     });

//     // Optionally generate invoice number (if needed for display or testing)
//     const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); //  Correct

//     // Send welcome email
//     const mailOptions = {
//       from: `"WTL Tourism Pvt. Ltd." <contact@worldtriplink.com>`,
//       to: email,
//       subject: "Welcome to WTL Tourism - Sub-Admin Account Created",
//       html: `
//         <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
//           <div style="text-align: center; padding-bottom: 20px;">
//             ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
//           </div>
//           <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
//           <p><strong>Email:</strong> ${email}</p>
//           <p><strong>Password:</strong> ${generatedPassword}</p>
//           <p>Please log in and change your password after first login.</p>
//           <br>
//           <div style="text-align: center;">
//             <a href="https://admin.routebudget.com/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
//           </div>
//         </div>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     // Return response without password
//     const { password: _, ...subAdminResponse } = newSubAdmin.toJSON();

//     return res.status(201).json({
//       success: true,
//       message: "Sub-admin created successfully",
//       newSubAdmin: subAdminResponse,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to add sub-admin",
//       error: error.message,
//     });
//   }
// };


// //  Register Admin
// const registerAdmin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check if admin already exists
//     let existingAdmin = await Admin.findOne({ email });
//     if (existingAdmin)
//       return res.status(400).json({ message: "Admin already registered" });

//     //  Hash the password before saving
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newAdmin = new Admin({ email, password: hashedPassword });

//     await newAdmin.save();

//     res.status(201).json({ message: "Admin registered successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// //  Sub-Admin Login ---- not used
// const adminLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Trim email and password to avoid white space errors
//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     // Use lean() for performance (returns plain JS object, not full Mongoose doc)
//     const admin = await Admin.findOne({ where: { email: email.trim() } });
//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     // Check if blocked
//     if (admin.status === "Blocked") {
//       return res
//         .status(403)
//         .json({ message: "Your account is blocked. Contact admin." });
//     }

//     // Compare hashed password
//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Generate token
//     const token = jwt.sign(
//       { id: admin._id, role: "admin" },
//       process.env.JWT_SECRET,
//       { expiresIn: "10d" }
//     );

//     res.status(200).json({ message: "Login successful!", token, id: admin._id });

//   } catch (error) {
//     console.error("=4 Login error:", error.message);
//     res.status(500).json({ message: "Server Error" });
//   }
// };


// const totalSubAdminCount = async (req, res) => {
//   try {
//     // If you are counting admin documents
//     const subAdminCount = await Admin.count({ where: { role: 'subadmin' }, });

//     res.status(200).json({ count: subAdminCount }); //  Send correct response
//   } catch (error) {
//     res.status(500).json({ message: "Error counting sub-admins" });
//   }
// };



// const totalDriver = async (req, res) => {
//   try {
//     // If you are counting admin documents
//     const driverCount = await Driver.count(); // Ensure this is the correct model for the task

//     res.status(200).json({ count: driverCount }); //  Send correct response
//   } catch (error) {
//     res.status(500).json({ message: "Error counting sub-admins" });
//   }
// };

// const totalCab = async (req, res) => {
//   try {

//     // If you are counting admin documents
//     const cab = await Cab.countDocuments(); // Ensure this is the correct model for the task

//     res.status(200).json({ count: cab }); //  Send correct response
//   } catch (error) {
//     res.status(500).json({ message: "Error counting sub-admins" });
//   }
// };

// // Get all sub-admins
// const getAllSubAdmins = async (req, res) => {
//   try {
//     const subAdmins = await Admin.findAll({
//       attributes: { exclude: ['password'] }, // Exclude password from response
//       order: [['createdAt', 'DESC']],       // Sort by createdAt descending
//     });

//     res.status(200).json({ success: true, subAdmins });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch sub-admins',
//       error: error.message,
//     });
//   }
// };



// // Invoice number generator
// const generateInvoiceNumber = (subadminName) => {
//   if (!subadminName) return "NA-000000";

//   const namePrefix = subadminName.trim().split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 3); // E.g., Radiant IT Service � RIS
//   const now = new Date();
//   const currentMonth = now.getMonth() + 1;
//   const currentYear = now.getFullYear() % 100;
//   const nextYear = (now.getFullYear() + 1) % 100;
//   const financialYear = currentMonth >= 4 ? `${currentYear}${nextYear}` : `${(currentYear - 1).toString().padStart(2, "0")}${currentYear}`;
//   const randomNumber = Math.floor(100000 + Math.random() * 900000);
//   return `${namePrefix}${financialYear}-${randomNumber}`;
// };

// // Controller to add a new sub-admin
// // const addNewSubAdmin = async (req, res) => {
// //   try {
// //     const { name, email, role, phone, status, companyInfo } = req.body;

// //     const profileImage = req.files?.profileImage?.[0]?.path || null;
// //     const companyLogo = req.files?.companyLogo?.[0]?.path || null;
// //     const signature = req.files?.signature?.[0]?.path || null;

// //     // Basic validation
// //     if (!name || !email || !role || !phone || !companyInfo) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "All required fields must be provided.",
// //       });
// //     }

// //     // Check for existing email
// //     const existingSubAdmin = await Admin.findOne({ email });
// //     if (existingSubAdmin) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Email already in use",
// //       });
// //     }

// //     // Generate and hash password
// //     const generatedPassword = Math.random().toString(36).slice(-8);
// //     const hashedPassword = await bcrypt.hash(generatedPassword, 10);

// //     // Create subadmin
// //     const newSubAdmin = await Admin.create({
// //       profileImage,
// //       name,
// //       email,
// //       password: hashedPassword,
// //       role,
// //       phone,
// //       status: status || "Active",
// //       companyLogo,
// //       companyInfo,
// //       signature,
// //     });

// //     // Optionally generate invoice number (if needed for display or testing)
// //     const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); //  Correct

// //     // Send welcome email
// //     const mailOptions = {
// //       from:`"WTL Tourism Pvt. Ltd." <contact@worldtriplink.com>`,
// //       to: email,
// //       subject: "Welcome to WTL Tourism - Sub-Admin Account Created",
// //       html: `
// //         <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
// //           <div style="text-align: center; padding-bottom: 20px;">
// //             ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
// //           </div>
// //           <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
// //           <p><strong>Email:</strong> ${email}</p>
// //           <p><strong>Password:</strong> ${generatedPassword}</p>
// //           <p>Please log in and change your password after first login.</p>
// //           <br>
// //           <div style="text-align: center;">
// //             <a href="https://admin.routebudget.com/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
// //           </div>
// //         </div>
// //       `,
// //     };

// //     await transporter.sendMail(mailOptions);

// //     // Return response without password
// //     const { password: _, ...subAdminResponse } = newSubAdmin.toObject();

// //     return res.status(201).json({
// //       success: true,
// //       message: "Sub-admin created successfully",
// //       newSubAdmin: subAdminResponse,
// //     });
// //   } catch (error) {
// //     return res.status(500).json({
// //       success: false,
// //       message: "Failed to add sub-admin",
// //       error: error.message,
// //     });
// //   }
// // };


// // Get a single sub-admin by ID
// const getSubAdminById = async (req, res) => {
//   try {
//     const subAdmin = await Admin.findByPk(req.params.id, {
//       attributes: { exclude: ['password'] }, // Exclude password field
//     });
//     if (!subAdmin) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Sub-admin not found" });
//     }

//     res.status(200).json({ success: true, subAdmin });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch sub-admin",
//       error: error.message,
//     });
//   }
// };

// // const updateSubAdmin = async (req, res) => {
// //   try {
// //     const { name, email, password, role, phone, status, profileImage } =
// //       req.body;
// //     const subAdminId = req.params.id;

// //     // Check if email is being changed and if it already exists
// //     if (email) {
// //       const existingSubAdmin = await Admin.findOne({
// //         email,
// //         _id: { $ne: subAdminId },
// //       });
// //       if (existingSubAdmin) {
// //         return res.status(400).json({
// //           success: false,
// //           message: "Email already in use by another sub-admin",
// //         });
// //       }
// //     }

// //     // Prepare update data
// //     const updateData = {
// //       name,
// //       email,
// //       role,
// //       phone,
// //       status,
// //     };

// //     // Only include profileImage if it's provided
// //     if (profileImage !== undefined) {
// //       updateData.profileImage = profileImage;
// //     }

// //     // Only update password if provided
// //     if (password) {
// //       const salt = await bcrypt.genSalt(10);
// //       updateData.password = await bcrypt.hash(password, salt);
// //     }

// //     // Update sub-admin
// //     const updatedSubAdmin = await Admin.findByIdAndUpdate(
// //       subAdminId,
// //       { $set: updateData },
// //       { new: true, runValidators: true }
// //     ).select("-password");

// //     if (!updatedSubAdmin) {
// //       return res
// //         .status(404)
// //         .json({ success: false, message: "Sub-admin not found" });
// //     }

// //     res.status(200).json({
// //       success: true,
// //       message: "Sub-admin updated successfully",
// //       subAdmin: updatedSubAdmin,
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: "Failed to update sub-admin",
// //       error: error.message,
// //     });
// //   }
// // };

// const updateSubAdmin = async (req, res) => {
//   try {
//     let subAdminId = parseInt(req.params.id);
//     console.log("Updating subadmin with ID:", subAdminId);
//     console.log("typeof ID:", typeof subAdminId);

//     const { name, email, password, role, phone, status, profileImage } = req.body;
//     console.log("body",req.body)

//     // 1. Check if sub-admin exists
//     const existingSubAdmin = await Admin.findByPk(subAdminId);
//     if (!existingSubAdmin) {
//       return res.status(404).json({
//         success: false,
//         message: "Sub-admin not found in DB before update",
//       });
//     }

//     // 2. Check if email is already used by another sub-admin
//     if (email) {
//       const duplicateEmail = await Admin.findOne({
//         where: {
//           email,
//           id: { [Op.ne]: subAdminId },
//         },
//       });

//       if (duplicateEmail) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already in use by another sub-admin",
//         });
//       }
//     }

//     //  3. Dynamically build updateData with only defined fields
//     const updateData = {};
//     if (name !== undefined) updateData.name = name;
//     if (email !== undefined) updateData.email = email;
//     if (role !== undefined) updateData.role = role;
//     if (phone !== undefined) updateData.phone = phone;
//     if (status !== undefined) updateData.status = status;
//     if (profileImage !== undefined) updateData.profileImage = profileImage;

//     if (password) {
//       const salt = await bcrypt.genSalt(10);
//       updateData.password = await bcrypt.hash(password, salt);
//     }

//     console.log("Updating with data:", updateData); //  log to debug

//     // 4. Update
//     await existingSubAdmin.update(updateData);

//     const result = existingSubAdmin.toJSON();
//     delete result.password;

//     return res.status(200).json({
//       success: true,
//       message: "Sub-admin updated successfully",
//       subAdmin: result,
//     });
//   } catch (error) {
//     console.error("Update error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update sub-admin",
//       error: error.message,
//     });
//   }
// };



// const deleteSubAdmin = async (req, res) => {
//   try {
//     // Find and delete the sub-admin
//     const deletedSubAdmin = await Admin.findByIdAndDelete(req.params.id);

//     if (!deletedSubAdmin) {
//       return res.status(404).json({ success: false, message: "Sub-admin not found" });
//     }

//     // Delete related cabs and drivers (assuming cab and driver are related to sub-admin)
//     const deletedCabs = await Cab.deleteMany({ addedBy: req.params.id }); // Modify based on your schema
//     const deletedDrivers = await Driver.deleteMany({ addedBy: req.params.id }); // Modify based on your schema

//     // Check if related cabs and drivers are deleted
//     const relatedDataDeleted = deletedCabs.deletedCount > 0 || deletedDrivers.deletedCount > 0;

//     // If no related cabs or drivers are deleted, it's still fine to delete the sub-admin
//     if (!relatedDataDeleted) {
//     }

//     // Send success response
//     res.status(200).json({
//       success: true,
//       message: "Sub-admin and related cabs and drivers deleted successfully, if any",
//       deletedSubAdmin,
//       deletedCabs,
//       deletedDrivers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete sub-admin and related data",
//       error: error.message,
//     });
//   }
// };


// // Toggle block status
// const toggleBlockStatus = async (req, res) => {
//   try {
//     const subAdminId = parseInt(req.params.id); // Ensure it's a number if your ID is integer

//     // Find the sub-admin
//     const subAdmin = await Admin.findByPk(subAdminId);

//     if (!subAdmin) {
//       return res.status(404).json({
//         success: false,
//         message: "Sub-admin not found",
//       });
//     }

//     // Toggle status
//     const newStatus = subAdmin.status === "Active" ? "Inactive" : "Active";

//     // Update status
//     await Admin.update(
//       { status: newStatus },
//       { where: { id: subAdminId } }
//     );

//     // Refetch the updated subAdmin without password
//     const updatedSubAdmin = await Admin.findByPk(subAdminId, {
//       attributes: { exclude: ['password'] }
//     });

//     res.status(200).json({
//       success: true,
//       message: `Sub-admin ${newStatus === "Active" ? "activated" : "deactivated"} successfully`,
//       status: newStatus,
//       subAdmin: updatedSubAdmin,
//     });

//   } catch (error) {
//     console.error("Toggle Status Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update sub-admin status",
//       error: error.message,
//     });
//   }
// };


// // expense
// const addExpense = async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;

//     const newExpense = new Expense({ type, amount, driver, cabNumber });

//     await newExpense.save();

//     res.status(201).json(newExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get all expenses
// const getAllExpenses = async (req, res) => {
//   try {
//     const cabs = await Cab.find().populate('cab');

//     if (cabs.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No cabs found for this admin.",
//       });
//     }

//     const expenses = cabs.map((assign) => {
//       const fuelAmounts = assign.tripDetails?.fuel?.amount || [];
//       const fastTagAmounts = assign.tripDetails?.fastTag?.amount || [];
//       const tyreRepairAmounts = assign.tripDetails?.tyrePuncture?.repairAmount || [];
//       const otherAmounts = assign.tripDetails?.otherProblems?.amount || [];

//       const fuelTotal = fuelAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const fastTagTotal = fastTagAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const tyreTotal = tyreRepairAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const otherTotal = otherAmounts.reduce((sum, val) => sum + (val || 0), 0);

//       const totalExpense = fuelTotal + fastTagTotal + tyreTotal + otherTotal;

//       return {
//         cabNumber: assign.cab?.cabNumber || "Unknown", // <-- correct path
//         totalExpense,
//         breakdown: {
//           fuel: fuelTotal,
//           fastTag: fastTagTotal,
//           tyrePuncture: tyreTotal,
//           otherProblems: otherTotal,
//         }
//       };
//     });

//     // Sort by highest expense first
//     expenses.sort((a, b) => b.totalExpense - a.totalExpense);

//     if (expenses.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No expenses found after calculation!",
//       });
//     }

//     res.status(200).json({ success: true, data: expenses });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };


// // Delete an expense
// const deleteExpense = async (req, res) => {
//   try {
//     await Expense.findByIdAndDelete(req.params.id);
//     res.json({ message: "Expense deleted" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update an expense
// const updateExpense = async (req, res) => {
//   try {
//     const { type, amount, driver, cabNumber } = req.body;
//     const updatedExpense = await Expense.findByIdAndUpdate(
//       req.params.id,
//       { type, amount, driver, cabNumber },
//       { new: true, runValidators: true }
//     );

//     if (!updatedExpense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }

//     res.json(updatedExpense);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get all analytics data
// const getAnalytics = async (req, res) => {
//   try {
//     const data = await Analytics.find().sort({ date: -1 }).limit(10);
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// // Add new analytics data
// const addAnalytics = async (req, res) => {
//   try {
//     const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
//       req.body;
//     const newEntry = new Analytics({
//       totalRides,
//       revenue,
//       customerSatisfaction,
//       fleetUtilization,
//     });
//     await newEntry.save();
//     res.status(201).json(newEntry);
//   } catch (error) {
//     res.status(500).json({ message: "Error adding data" });
//   }
// };



// const getSubadminExpenses = async (req, res) => {
//   try {
//     // Fetch all required data in parallel to improve performance
//     const [subadmins, trips, drivers, cabDetails] = await Promise.all([
//       Admin.find(),
//       Cab.find().populate('cab').populate('assignedBy').populate("driver"),
//       Driver.find(),
//       CabDetails.find(),
//     ]);

//     if (!trips || trips.length === 0) {
//       return res.status(404).json({ success: false, message: "No trips found!" });
//     }

//     // Aggregate expenses by subadmin
//     const subadminExpenseMap = new Map();

//     // Process each trip to calculate expenses
//     trips.forEach((trip) => {
//       const subadminId = trip.assignedBy?._id?.toString();
//       const subadminName = trip.assignedBy?.name || "N/A";

//       if (!subadminId) return; // Skip trips without a valid subadmin

//       // Calculate expenses for this trip
//       const fuel = trip.tripDetails?.fuel?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const fastTag = trip.tripDetails?.fastTag?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const tyrePuncture = trip.tripDetails?.tyrePuncture?.repairAmount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const otherProblems = trip.tripDetails?.otherProblems?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const totalExpense = fuel + fastTag + tyrePuncture + otherProblems;

//       // Initialize or update the subadmin's data in the map
//       if (!subadminExpenseMap.has(subadminId)) {
//         subadminExpenseMap.set(subadminId, {
//           SubAdmin: subadminName,
//           totalExpense: 0,
//           breakdown: { fuel: 0, fastTag: 0, tyrePuncture: 0, otherProblems: 0 },
//           tripCount: 0,
//         });
//       }

//       const subadminData = subadminExpenseMap.get(subadminId);
//       subadminData.totalExpense += totalExpense;
//       subadminData.breakdown.fuel += fuel;
//       subadminData.breakdown.fastTag += fastTag;
//       subadminData.breakdown.tyrePuncture += tyrePuncture;
//       subadminData.breakdown.otherProblems += otherProblems;
//       subadminData.tripCount += 1;
//     });

//     // Calculate total drivers and cabs per subadmin
//     subadminExpenseMap.forEach((subadminData, subadminId) => {
//       // Count drivers for this subadmin
//       const totalDrivers = drivers.filter(driver =>
//         driver.addedBy?._id?.toString() === subadminId
//       ).length;

//       // Count cabs for this subadmin
//       const totalCabs = cabDetails.filter(cabDetail =>
//         cabDetail.addedBy?.toString() === subadminId
//       ).length;

//       subadminData.totalDrivers = totalDrivers;
//       subadminData.totalCabs = totalCabs;
//     });

//     // Convert the map to an array and sort by total expense
//     const expenses = Array.from(subadminExpenseMap.values()).sort((a, b) => b.totalExpense - a.totalExpense);

//     if (expenses.length === 0) {
//       return res.status(404).json({ success: false, message: "No expenses found after calculation!" });
//     }

//     res.status(200).json({ success: true, data: expenses });
//   } catch (error) {
//     console.error("Error in getSubadminExpenses:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// //  Export all functions correctly
// module.exports = {
//   registerAdmin,
//   adminLogin,
//   totalSubAdminCount,
//   getAllSubAdmins,
//   addNewSubAdmin,
//   getSubAdminById,
//   updateSubAdmin,
//   deleteSubAdmin,
//   toggleBlockStatus,
//   totalDriver,
//   totalCab,
//   addExpense,
//   getAllExpenses,
//   deleteExpense,
//   updateExpense,
//   getAnalytics,
//   addAnalytics,
//   getSubadminExpenses
// };










const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { Driver, Admin, CabsDetails,CabDetails, Cab, Analytics } = require('../models');
require("dotenv").config();
const Expense = require("../models/subAdminExpenses");
// const Analytics = require("../models/SubadminAnalytics");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { Op } = require("sequelize");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const addNewSubAdmin = async (req, res) => {
  try {
    const { name, email, role, phone, status, companyInfo } = req.body;
    console.log("response", req.body);

    const profileImage = req.files?.profileImage?.[0]?.path || null;
    const companyLogo = req.files?.companyLogo?.[0]?.path || null;
    const signature = req.files?.signature?.[0]?.path || null;

    // Basic validation
    if (!name || !email || !role || !phone || !companyInfo) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Check for existing email
    // const existingSubAdmin = await Admin.findOne({ where: { email } });
    const existingSubAdmin = await Admin.findOne({ where: { email } });

    if (existingSubAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Generate and hash password
    const generatedPassword = Math.random().toString(36).slice(-8);
    // const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create subadmin
    const newSubAdmin = await Admin.create({
      profileImage,
      name,
      email,
      password: generatedPassword,
      role,
      phone,
      status: status || "Active",
      companyLogo,
      companyInfo,
      signature,
    });

    // Optionally generate invoice number (if needed for display or testing)
    const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); //   Correct

    // Send welcome email
    const mailOptions = {
      from: `"WTL Tourism Pvt. Ltd." <contact@worldtriplink.com>`,
      to: email,
      subject: "Welcome to WTL Tourism - Sub-Admin Account Created",
      html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
          <div style="text-align: center; padding-bottom: 20px;">
            ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
          </div>
          <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${generatedPassword}</p>
          <p>Please log in and change your password after first login.</p>
          <br>
          <div style="text-align: center;">
            <a href="https://admin.routebudget.com/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Return response without password
    const { password: _, ...subAdminResponse } = newSubAdmin.toJSON();

    return res.status(201).json({
      success: true,
      message: "Sub-admin created successfully",
      newSubAdmin: subAdminResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add sub-admin",
      error: error.message,
    });
  }
};


//   Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin already exists
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already registered" });

    //   Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

//   Sub-Admin Login ---- not used
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trim email and password to avoid white space errors
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Use lean() for performance (returns plain JS object, not full Mongoose doc)
    const admin = await Admin.findOne({ where: { email: email.trim() } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if blocked
    if (admin.status === "Blocked") {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Contact admin." });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.status(200).json({ message: "Login successful!", token, id: admin._id });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const totalSubAdminCount = async (req, res) => {
  try {
    // If you are counting admin documents
    const subAdminCount = await Admin.count({ where: { role: 'subadmin' }, });

    res.status(200).json({ count: subAdminCount }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalDriver = async (req, res) => {
  try {
    // If you are counting admin documents
    const driverCount = await Driver.count(); // Ensure this is the correct model for the task

    res.status(200).json({ count: driverCount }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting sub-admins" });
  }
};

const totalCab = async (req, res) => {
  try {
    // If you are counting admin documents
    const cab = await CabsDetails.count(); // Ensure this is the correct model for the task

    res.status(200).json({ count: cab }); //   Send correct response
  } catch (error) {
    res.status(500).json({ message: "Error counting cabs" });
  }
};

// Get all sub-admins
const getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.findAll({
      attributes: { exclude: ['password'] }, // Exclude password from response
      order: [['createdAt', 'DESC']],       // Sort by createdAt descending
    });

    res.status(200).json({ success: true, subAdmins });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-admins',
      error: error.message,
    });
  }
};

// Invoice number generator
const generateInvoiceNumber = (subadminName) => {
  if (!subadminName) return "NA-000000";

  const namePrefix = subadminName.trim().split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 3); // E.g., Radiant IT Service   RIS
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100;
  const nextYear = (now.getFullYear() + 1) % 100;
  const financialYear = currentMonth >= 4 ? `${currentYear}${nextYear}` : `${(currentYear - 1).toString().padStart(2, "0")}${currentYear}`;
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `${namePrefix}${financialYear}-${randomNumber}`;
};

// Controller to add a new sub-admin
// const addNewSubAdmin = async (req, res) => {
//   try {
//     const { name, email, role, phone, status, companyInfo } = req.body;

//     const profileImage = req.files?.profileImage?.[0]?.path || null;
//     const companyLogo = req.files?.companyLogo?.[0]?.path || null;
//     const signature = req.files?.signature?.[0]?.path || null;

//     // Basic validation
//     if (!name || !email || !role || !phone || !companyInfo) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be provided.",
//       });
//     }

//     // Check for existing email
//     const existingSubAdmin = await Admin.findOne({ email });
//     if (existingSubAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already in use",
//       });
//     }

//     // Generate and hash password
//     const generatedPassword = Math.random().toString(36).slice(-8);
//     const hashedPassword = await bcrypt.hash(generatedPassword, 10);

//     // Create subadmin
//     const newSubAdmin = await Admin.create({
//       profileImage,
//       name,
//       email,
//       password: hashedPassword,
//       role,
//       phone,
//       status: status || "Active",
//       companyLogo,
//       companyInfo,
//       signature,
//     });

//     // Optionally generate invoice number (if needed for display or testing)
//     const invoiceNumber = generateInvoiceNumber(newSubAdmin.name); //   Correct

//     // Send welcome email
//     const mailOptions = {
//       from:`"WTL Tourism Pvt. Ltd." <contact@worldtriplink.com>`,
//       to: email,
//       subject: "Welcome to WTL Tourism - Sub-Admin Account Created",
//       html: `
//         <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;">
//           <div style="text-align: center; padding-bottom: 20px;">
//             ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 120px;">` : ""}
//           </div>
//           <h2 style="text-align: center; color: #333;">Sub-Admin Account Created</h2>
//           <p><strong>Email:</strong> ${email}</p>
//           <p><strong>Password:</strong> ${generatedPassword}</p>
//           <p>Please log in and change your password after first login.</p>
//           <br>
//           <div style="text-align: center;">
//             <a href="https://admin.routebudget.com/" style="background: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Login Now</a>
//           </div>
//         </div>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     // Return response without password
//     const { password: _, ...subAdminResponse } = newSubAdmin.toObject();

//     return res.status(201).json({
//       success: true,
//       message: "Sub-admin created successfully",
//       newSubAdmin: subAdminResponse,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to add sub-admin",
//       error: error.message,
//     });
//   }
// };


// Get a single sub-admin by ID
const getSubAdminById = async (req, res) => {
  try {
    const subAdmin = await Admin.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }, // Exclude password field
    });
    if (!subAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-admin not found" });
    }

    res.status(200).json({ success: true, subAdmin });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admin",
      error: error.message,
    });
  }
};


// const updateSubAdmin = async (req, res) => {
//   try {
//     const subAdminId = parseInt(req.params.id);
//     const { name, email, password, role, phone, status } = req.body;

//     console.log("Updating subadmin with ID:", subAdminId);
//     console.log("Body:", req.body);
//     console.log("File:", req.file); // ✅ Uploaded image

//     // 1. Check if sub-admin exists
//     const existingSubAdmin = await Admin.findByPk(subAdminId);
//     if (!existingSubAdmin) {
//       return res.status(404).json({ success: false, message: "Sub-admin not found" });
//     }

//     // 2. Check for duplicate email
//     if (email) {
//       const duplicateEmail = await Admin.findOne({
//         where: { email, id: { [Op.ne]: subAdminId } },
//       });
//       if (duplicateEmail) {
//         return res.status(400).json({ success: false, message: "Email already in use" });
//       }
//     }

//     // 3. Build updateData
//     const updateData = {};
//     if (name) updateData.name = name;
//     if (email) updateData.email = email;
//     if (role) updateData.role = role;
//     if (phone) updateData.phone = phone;
//     if (status) updateData.status = status;

//     // ✅ Save file path if uploaded
//     if (req.file) {
//       updateData.profileImage = `/uploads/profileImages/${req.file.filename}`;
//     }

//     if (password) {
//       const salt = await bcrypt.genSalt(10);
//       updateData.password = await bcrypt.hash(password, salt);
//     }

//     console.log("Updating with data:", updateData);

//     // 4. Update
//     await existingSubAdmin.update(updateData);

//     const result = existingSubAdmin.toJSON();
//     delete result.password;

//     // Add full image URL for frontend
//     if (result.profileImage) {
//       result.profileImage = `${req.protocol}://${req.get("host")}${result.profileImage}`;
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Sub-admin updated successfully",
//       subAdmin: result,
//     });
//   } catch (error) {
//     console.error("Update error:", error);
//     res.status(500).json({ success: false, message: "Failed to update sub-admin", error: error.message });
//   }
// };


// const deleteSubAdmin = async (req, res) => {
//   try {
//     // Find and delete the sub-admin
//     const deletedSubAdmin = await Admin.findByIdAndDelete(req.params.id);

//     if (!deletedSubAdmin) {
//       return res.status(404).json({ success: false, message: "Sub-admin not found" });
//     }

//     // Delete related cabs and drivers (assuming cab and driver are related to sub-admin)
//     const deletedCabs = await Cab.deleteMany({ addedBy: req.params.id }); // Modify based on your schema
//     const deletedDrivers = await Driver.deleteMany({ addedBy: req.params.id }); // Modify based on your schema

//     // Check if related cabs and drivers are deleted
//     const relatedDataDeleted = deletedCabs.deletedCount > 0 || deletedDrivers.deletedCount > 0;

//     // If no related cabs or drivers are deleted, it's still fine to delete the sub-admin
//     if (!relatedDataDeleted) {
//     }

//     // Send success response
//     res.status(200).json({
//       success: true,
//       message: "Sub-admin and related cabs and drivers deleted successfully, if any",
//       deletedSubAdmin,
//       deletedCabs,
//       deletedDrivers
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete sub-admin and related data",
//       error: error.message,
//     });
//   }
// };


// Toggle block status

const updateSubAdmin = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id);
    const {
      name,
      email,
      password,
      role,
      phone,
      status,
      companyInfo,
      companyLogo,
      signature,
    } = req.body;

    console.log("Updating subadmin with ID:", subAdminId);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    // 1. Check if sub-admin exists
    const existingSubAdmin = await Admin.findByPk(subAdminId);
    if (!existingSubAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // 2. Check for duplicate email
    if (email) {
      const duplicateEmail = await Admin.findOne({
        where: {
          email,
          id: { [Op.ne]: subAdminId },
        },
      });
      if (duplicateEmail) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    // 3. Build updateData
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (phone) updateData.phone = phone;
    if (status) updateData.status = status;
    if (companyInfo) updateData.companyInfo = companyInfo;
    if (companyLogo) updateData.companyLogo = companyLogo;
    if (signature) updateData.signature = signature;

    // ✅ Save file path if uploaded (local upload)
    if (req.file) {
      updateData.profileImage = `/uploads/profileImages/${req.file.filename}`;
    }

    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    console.log("Updating with data:", updateData);

    // 4. Update
    await existingSubAdmin.update(updateData);

    const result = existingSubAdmin.toJSON();
    delete result.password;

    // Fix image URLs only if they are not from Cloudinary or already absolute
    const makeFullUrl = (value) => {
      if (value && !value.startsWith("http")) {
        return `${req.protocol}://${req.get("host")}${value}`;
      }
      return value;
    };

    result.profileImage = makeFullUrl(result.profileImage);
    result.companyLogo = makeFullUrl(result.companyLogo);
    result.signature = makeFullUrl(result.signature);

    return res.status(200).json({
      success: true,
      message: "Sub-admin updated successfully",
      subAdmin: result,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update sub-admin",
      error: error.message,
    });
  }
};

const deleteSubAdmin = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id);

    // 1. Check if sub-admin exists
    const subAdmin = await Admin.findByPk(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: "Sub-admin not found" });
    }

    // 2. Delete related Cabs and Drivers (if your models have `addedBy` field)
    const deletedCabs = await CabsDetails.destroy({ where: { addedBy: subAdminId } });
    const deletedDrivers = await Driver.destroy({ where: { addedBy: subAdminId } });

    // 3. Delete Sub-Admin
    await subAdmin.destroy();

    // 4. Send response
    res.status(200).json({
      success: true,
      message: "Sub-admin and related cabs and drivers deleted successfully, if any",
      deletedSubAdmin: subAdmin, // The deleted sub-admin record
      deletedCabs: deletedCabs, // number of deleted cabs
      deletedDrivers: deletedDrivers, // number of deleted drivers
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-admin and related data",
      error: error.message,
    });
  }
};

// const toggleBlockStatus = async (req, res) => {
//   try {
//     const subAdminId = parseInt(req.params.id); // Ensure it's a number if your ID is integer

//     // Find the sub-admin
//     const subAdmin = await Admin.findByPk(subAdminId);

//     if (!subAdmin) {
//       return res.status(404).json({
//         success: false,
//         message: "Sub-admin not found",
//       });
//     }

//     // Toggle status
//     const newStatus = subAdmin.status === "Active" ? "Inactive" : "Active";

//     // Update status
//     await Admin.update(
//       { status: newStatus },
//       { where: { id: subAdminId } }
//     );

//     // Refetch the updated subAdmin without password
//     const updatedSubAdmin = await Admin.findByPk(subAdminId, {
//       attributes: { exclude: ['password'] }
//     });

//     res.status(200).json({
//       success: true,
//       message: `Sub-admin ${newStatus === "Active" ? "activated" : "deactivated"} successfully`,
//       status: newStatus,
//       subAdmin: updatedSubAdmin,
//     });

//   } catch (error) {
//     console.error("Toggle Status Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update sub-admin status",
//       error: error.message,
//     });
//   }
// };


// expense

const toggleBlockStatus = async (req, res) => {
  try {
    const subAdminId = parseInt(req.params.id); // Ensure it's a number if your ID is integer

    // Find the sub-admin
    const subAdmin = await Admin.findByPk(subAdminId);

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found",
      });
    }

    // Toggle status
    const newStatus = subAdmin.status === "Active" ? "Inactive" : "Active";

    // Update status
    await Admin.update(
      { status: newStatus },
      { where: { id: subAdminId } }
    );

    // Refetch the updated subAdmin without password
    const updatedSubAdmin = await Admin.findByPk(subAdminId, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      message: `Sub-admin ${newStatus === "Active" ? "activated" : "deactivated"} successfully`,
      status: newStatus,
      subAdmin: updatedSubAdmin,
    });

  } catch (error) {
    console.error("Toggle Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sub-admin status",
      error: error.message,
    });
  }
};

const addExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;

    const newExpense = new Expense({ type, amount, driver, cabNumber });

    await newExpense.save();

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an expense
const updateExpense = async (req, res) => {
  try {
    const { type, amount, driver, cabNumber } = req.body;
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { type, amount, driver, cabNumber },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all analytics data
// const getAnalytics = async (req, res) => {
//   try {
//     const data = await Analytics.find().sort({ date: -1 }).limit(10);
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

const getAnalytics = async (req, res) => {
  try {
    // Fetch latest 10 analytics records sorted by date DESC
    const data = await Analytics.findAll({
      order: [["date", "DESC"]], // Sequelize equivalent of sort({ date: -1 })
      limit: 10
    });

    res.json(data);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// const addAnalytics = async (req, res) => {
//   try {
//     const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
//       req.body;
//     const newEntry = new Analytics({
//       totalRides,
//       revenue,
//       customerSatisfaction,
//       fleetUtilization,
//     });
//     await newEntry.save();
//     res.status(201).json(newEntry);
//   } catch (error) {
//     res.status(500).json({ message: "Error adding data" });
//   }
// };

const addAnalytics = async (req, res) => {
  try {
    const { totalRides, revenue, customerSatisfaction, fleetUtilization } =
      req.body;
       const newEntry = await Analytics.create({
      totalRides,
      revenue,
      customerSatisfaction,
      fleetUtilization
    });
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Error adding data" });
  }
};



// const getSubadminExpenses = async (req, res) => {
//   try {
//     // Fetch all required data in parallel to improve performance
//     const [subadmins, trips, drivers, cabDetails] = await Promise.all([
//       Admin.find(),
//       Cab.find().populate('cab').populate('assignedBy').populate("driver"),
//       Driver.find(),
//       CabDetails.find(),
//     ]);

//     if (!trips || trips.length === 0) {
//       return res.status(404).json({ success: false, message: "No trips found!" });
//     }

//     // Aggregate expenses by subadmin
//     const subadminExpenseMap = new Map();

//     // Process each trip to calculate expenses
//     trips.forEach((trip) => {
//       const subadminId = trip.assignedBy?._id?.toString();
//       const subadminName = trip.assignedBy?.name || "N/A";

//       if (!subadminId) return; // Skip trips without a valid subadmin

//       // Calculate expenses for this trip
//       const fuel = trip.tripDetails?.fuel?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const fastTag = trip.tripDetails?.fastTag?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const tyrePuncture = trip.tripDetails?.tyrePuncture?.repairAmount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const otherProblems = trip.tripDetails?.otherProblems?.amount?.reduce((a, b) => a + (b || 0), 0) || 0;
//       const totalExpense = fuel + fastTag + tyrePuncture + otherProblems;

//       // Initialize or update the subadmin's data in the map
//       if (!subadminExpenseMap.has(subadminId)) {
//         subadminExpenseMap.set(subadminId, {
//           SubAdmin: subadminName,
//           totalExpense: 0,
//           breakdown: { fuel: 0, fastTag: 0, tyrePuncture: 0, otherProblems: 0 },
//           tripCount: 0,
//         });
//       }

//       const subadminData = subadminExpenseMap.get(subadminId);
//       subadminData.totalExpense += totalExpense;
//       subadminData.breakdown.fuel += fuel;
//       subadminData.breakdown.fastTag += fastTag;
//       subadminData.breakdown.tyrePuncture += tyrePuncture;
//       subadminData.breakdown.otherProblems += otherProblems;
//       subadminData.tripCount += 1;
//     });

//     // Calculate total drivers and cabs per subadmin
//     subadminExpenseMap.forEach((subadminData, subadminId) => {
//       // Count drivers for this subadmin
//       const totalDrivers = drivers.filter(driver =>
//         driver.addedBy?._id?.toString() === subadminId
//       ).length;

//       // Count cabs for this subadmin
//       const totalCabs = cabDetails.filter(cabDetail =>
//         cabDetail.addedBy?.toString() === subadminId
//       ).length;

//       subadminData.totalDrivers = totalDrivers;
//       subadminData.totalCabs = totalCabs;
//     });

//     // Convert the map to an array and sort by total expense
//     const expenses = Array.from(subadminExpenseMap.values()).sort((a, b) => b.totalExpense - a.totalExpense);

//     if (expenses.length === 0) {
//       return res.status(404).json({ success: false, message: "No expenses found after calculation!" });
//     }

//     res.status(200).json({ success: true, data: expenses });
//   } catch (error) {
//     console.error("Error in getSubadminExpenses:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


const getSubadminExpenses = async (req, res) => {
  try {
    // Fetch all data in parallel
    const [subadmins, trips, drivers, cabDetails] = await Promise.all([
      Admin.findAll(),
      CabsDetails.findAll({
        include: [Admin, Driver], // Associations आता बरोबर आहेत
      }),
      Driver.findAll({
        include: [Admin],
      }),
      CabsDetails.findAll(),
    ]);

    if (!trips || trips.length === 0) {
      return res.status(404).json({ success: false, message: "No trips found!" });
    }

    const subadminExpenseMap = new Map();

    trips.forEach((trip) => {
      const subadminId = trip.Admin?.id;
      const subadminName = trip.Admin?.name || "N/A";

      if (!subadminId) return;

      // Calculate expenses
      const fuel = Array.isArray(trip.fuel_amount)
        ? trip.fuel_amount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const fastTag = Array.isArray(trip.fastTag_amount)
        ? trip.fastTag_amount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const tyrePuncture = Array.isArray(trip.tyrePuncture_repairAmount)
        ? trip.tyrePuncture_repairAmount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const otherProblems = Array.isArray(trip.otherProblems_amount)
        ? trip.otherProblems_amount.reduce((a, b) => a + (b || 0), 0)
        : 0;

      const totalExpense = fuel + fastTag + tyrePuncture + otherProblems;

      // Initialize
      if (!subadminExpenseMap.has(subadminId)) {
        subadminExpenseMap.set(subadminId, {
          SubAdmin: subadminName,
          totalExpense: 0,
          breakdown: { fuel: 0, fastTag: 0, tyrePuncture: 0, otherProblems: 0 },
          tripCount: 0,
        });
      }

      const subadminData = subadminExpenseMap.get(subadminId);
      subadminData.totalExpense += totalExpense;
      subadminData.breakdown.fuel += fuel;
      subadminData.breakdown.fastTag += fastTag;
      subadminData.breakdown.tyrePuncture += tyrePuncture;
      subadminData.breakdown.otherProblems += otherProblems;
      subadminData.tripCount += 1;
    });

    // Add driver & cab counts
    subadminExpenseMap.forEach((subadminData, subadminId) => {
      const totalDrivers = drivers.filter(d => d.Admin?.id === subadminId).length;
      const totalCabs = cabDetails.filter(cab => cab.addedBy === subadminId).length;

      subadminData.totalDrivers = totalDrivers;
      subadminData.totalCabs = totalCabs;
    });

    const expenses = Array.from(subadminExpenseMap.values())
      .sort((a, b) => b.totalExpense - a.totalExpense);

    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: "No expenses found after calculation!" });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Error in getSubadminExpenses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// const getAllExpenses = async (req, res) => {
//   try {
//     const cabs = await Cab.find().populate('cab');

//     if (cabs.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No cabs found for this admin.",
//       });
//     }

//     const expenses = cabs.map((assign) => {
//       const fuelAmounts = assign.tripDetails?.fuel?.amount || [];
//       const fastTagAmounts = assign.tripDetails?.fastTag?.amount || [];
//       const tyreRepairAmounts = assign.tripDetails?.tyrePuncture?.repairAmount || [];
//       const otherAmounts = assign.tripDetails?.otherProblems?.amount || [];

//       const fuelTotal = fuelAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const fastTagTotal = fastTagAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const tyreTotal = tyreRepairAmounts.reduce((sum, val) => sum + (val || 0), 0);
//       const otherTotal = otherAmounts.reduce((sum, val) => sum + (val || 0), 0);

//       const totalExpense = fuelTotal + fastTagTotal + tyreTotal + otherTotal;

//       return {
//         cabNumber: assign.cab?.cabNumber || "Unknown", // <-- correct path
//         totalExpense,
//         breakdown: {
//           fuel: fuelTotal,
//           fastTag: fastTagTotal,
//           tyrePuncture: tyreTotal,
//           otherProblems: otherTotal,
//         }
//       };
//     });

//     // Sort by highest expense first
//     expenses.sort((a, b) => b.totalExpense - a.totalExpense);

//     if (expenses.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No expenses found after calculation!",
//       });
//     }

//     res.status(200).json({ success: true, data: expenses });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

const getAllExpenses = async (req, res) => {
  try {
    // Fetch all cab details
    const cabs = await CabsDetails.findAll();

    if (!cabs || cabs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cabs found.",
      });
    }

    // Calculate expenses for each cab
    const expenses = cabs.map((cab) => {
      const fuelAmounts = Array.isArray(cab.fuel_amount) ? cab.fuel_amount : [];
      const fastTagAmounts = Array.isArray(cab.fastTag_amount) ? cab.fastTag_amount : [];
      const tyreRepairAmounts = Array.isArray(cab.tyrePuncture_repairAmount) ? cab.tyrePuncture_repairAmount : [];
      const otherAmounts = Array.isArray(cab.otherProblems_amount) ? cab.otherProblems_amount : [];

      const fuelTotal = fuelAmounts.reduce((sum, val) => sum + (val || 0), 0);
      const fastTagTotal = fastTagAmounts.reduce((sum, val) => sum + (val || 0), 0);
      const tyreTotal = tyreRepairAmounts.reduce((sum, val) => sum + (val || 0), 0);
      const otherTotal = otherAmounts.reduce((sum, val) => sum + (val || 0), 0);

      const totalExpense = fuelTotal + fastTagTotal + tyreTotal + otherTotal;

      return {
        cabNumber: cab.cabNumber || "Unknown",
        totalExpense,
        breakdown: {
          fuel: fuelTotal,
          fastTag: fastTagTotal,
          tyrePuncture: tyreTotal,
          otherProblems: otherTotal,
        },
      };
    });

    // Sort by highest expense first
    expenses.sort((a, b) => b.totalExpense - a.totalExpense);

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No expenses found after calculation!",
      });
    }

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error("Error in getAllExpenses:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


//   Export all functions correctly
module.exports = {
  registerAdmin,
  adminLogin,
  totalSubAdminCount,
  getAllSubAdmins,
  addNewSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  deleteSubAdmin,
  toggleBlockStatus,
  totalDriver,
  totalCab,
  addExpense,
  getAllExpenses,
  deleteExpense,
  updateExpense,
  getAnalytics,
  addAnalytics,
  getSubadminExpenses
};