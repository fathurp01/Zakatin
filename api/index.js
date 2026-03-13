const { app, initApp } = require('../server');

module.exports = async (req, res) => {
  try {
    await initApp();
    return app(req, res);
  } catch (error) {
    console.error('Inisialisasi aplikasi gagal:', error);
    return res.status(500).json({ message: 'Inisialisasi aplikasi gagal.' });
  }
};
