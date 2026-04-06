const dataValidation = (req, res, next) => {
  // Mangabuddy uses simpler URL structure
  // Just ensure page number is valid
  req.query.page = req.query.page || 1;

  next();
};

module.exports = dataValidation;
