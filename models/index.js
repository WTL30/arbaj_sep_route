
// const { Sequelize } = require('sequelize');
// const AdminModel = require('./Admin');
// const MasterAdminModel = require('./masterAdmin');
// const DriverModel = require('./loginModel');
// const CabsDetailsModel = require('./CabsDetails');
// const CabAssignmentModel = require('./CabAssignment');
// const CabModel = require('./Cab');
// const ServicingAssignmentModel = require('./ServicingAssignment');

// const sequelize = new Sequelize('Car-Expengo', 'postgres', 'post1', {
//   host: 'localhost',
//   dialect: 'postgres',
//   logging: false,
// });

// // Initialize models
// const Admin = AdminModel(sequelize);
// const MasterAdmin = MasterAdminModel(sequelize);
// const Driver = DriverModel(sequelize);
// const CabsDetails = CabsDetailsModel(sequelize);
// const CabAssignment = CabAssignmentModel(sequelize);
// const Cab = CabModel(sequelize);
// const ServicingAssignment = ServicingAssignmentModel(sequelize);

// // Associations
// Driver.hasMany(CabAssignment, { foreignKey: 'driverId' });
// CabAssignment.belongsTo(Driver, { foreignKey: 'driverId' });

// CabsDetails.hasMany(CabAssignment, { foreignKey: 'cabId' });
// CabAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });

// Admin.hasMany(CabAssignment, { foreignKey: 'assignedBy' });
// CabAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });

// CabsDetails.belongsTo(Driver, { foreignKey: 'driverId' });
// CabsDetails.belongsTo(Admin, { foreignKey: 'addedBy' });

// Cab.belongsTo(CabsDetails, { foreignKey: 'cabNumberId' });
// CabsDetails.hasMany(Cab, { foreignKey: 'cabNumberId' });

// // Servicing Associations (NO ALIASES USED)
// ServicingAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });
// CabsDetails.hasMany(ServicingAssignment, { foreignKey: 'cabId' });

// ServicingAssignment.belongsTo(Driver, { foreignKey: 'driverId' });
// Driver.hasMany(ServicingAssignment, { foreignKey: 'driverId' });

// ServicingAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });
// Admin.hasMany(ServicingAssignment, { foreignKey: 'assignedBy' });

// // Sync DB
// sequelize
//   .sync({ alter: true })
//   .then(() => console.log('✅ Database synced successfully'))
//   .catch((err) => console.error('❌ Failed to sync database:', err));

// module.exports = {
//   sequelize,
//   Admin,
//   MasterAdmin,
//   Driver,
//   CabsDetails,
//   CabAssignment,
//   Cab,
//   ServicingAssignment,
// };



const { Sequelize, DataTypes } = require('sequelize');

// Sequelize instance
const sequelize = new Sequelize('route_budget', 'postgres', 'password@181298', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

// Import models
const AdminModel = require('./Admin');
const MasterAdminModel = require('./masterAdmin');
const DriverModel = require('./loginModel');
const CabsDetailsModel = require('./CabsDetails');
const CabAssignmentModel = require('./CabAssignment');
const CabModel = require('./Cab');
const ServicingAssignmentModel = require('./ServicingAssignment');
const AnalyticsModel = require('./SubadminAnalytics');
const ExpenseModel = require('./Expense');
const SubAdminPermissionsModel = require('./subAdminPermissions');
const SubadminExpensesModel = require ("./subAdminExpenses")

// Initialize models
const Admin = AdminModel(sequelize, DataTypes);
const MasterAdmin = MasterAdminModel(sequelize, DataTypes);
const Driver = DriverModel(sequelize, DataTypes);
const CabsDetails = CabsDetailsModel(sequelize, DataTypes);
const CabAssignment = CabAssignmentModel(sequelize, DataTypes);
const Cab = CabModel(sequelize, DataTypes);
const ServicingAssignment = ServicingAssignmentModel(sequelize, DataTypes);
const Analytics = AnalyticsModel(sequelize, DataTypes);
const Expense = ExpenseModel(sequelize, DataTypes);
const SubAdminPermissions = SubAdminPermissionsModel(sequelize, DataTypes);
const SubadminExpenses = SubadminExpensesModel(sequelize,DataTypes);

// Associations
Driver.hasMany(CabAssignment, { foreignKey: 'driverId' });
CabAssignment.belongsTo(Driver, { foreignKey: 'driverId' });

CabsDetails.hasMany(CabAssignment, { foreignKey: 'cabId' });
CabAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });

Admin.hasMany(CabAssignment, { foreignKey: 'assignedBy' });
CabAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });

CabsDetails.belongsTo(Driver, { foreignKey: 'driverId' });
CabsDetails.belongsTo(Admin, { foreignKey: 'addedBy' });

Cab.belongsTo(CabsDetails, { foreignKey: 'cabNumberId' });
CabsDetails.hasMany(Cab, { foreignKey: 'cabNumberId' });

ServicingAssignment.belongsTo(CabsDetails, { foreignKey: 'cabId' });
CabsDetails.hasMany(ServicingAssignment, { foreignKey: 'cabId' });

ServicingAssignment.belongsTo(Driver, { foreignKey: 'driverId' });
Driver.hasMany(ServicingAssignment, { foreignKey: 'driverId' });

ServicingAssignment.belongsTo(Admin, { foreignKey: 'assignedBy' });
Admin.hasMany(ServicingAssignment, { foreignKey: 'assignedBy' });

// Optional association for SubAdminPermissions (if Admin → SubAdmin)
SubAdminPermissions.belongsTo(Admin, { foreignKey: 'subAdminId' });
Admin.hasMany(SubAdminPermissions, { foreignKey: 'subAdminId' });

Admin.hasMany(Expense, { foreignKey: 'adminId' });
Expense.belongsTo(Admin, { foreignKey: 'adminId' });

// ✅ SubadminExpenses
Admin.hasMany(SubadminExpenses, { foreignKey: 'adminId' });
SubadminExpenses.belongsTo(Admin, { foreignKey: 'adminId' });




// Sync DB
sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ Database synced successfully'))
  .catch((err) => console.error(' Failed to sync database:', err));

// Export all models
module.exports = {
  sequelize,
  Admin,
  MasterAdmin,
  Driver,
  CabsDetails,
  CabAssignment,
  Cab,
  ServicingAssignment,
  Analytics,
  Expense,
  SubAdminPermissions,
  SubadminExpenses,
};
