module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  DEBUG: process.env.DEBUG === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development'
};