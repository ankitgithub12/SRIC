const express = require('express');
const router = express.Router();

const feePayments = [
  { id: 1, student: 'John Doe', amount: 100, date: '2024-01-15' },
  { id: 2, student: 'Jane Smith', amount: 150, date: '2024-01-16' }
];

router.get('/', (req, res) => {
  res.json(feePayments);
});

router.post('/', (req, res) => {
  const newPayment = {
    id: feePayments.length + 1,
    ...req.body
  };
  feePayments.push(newPayment);
  res.status(201).json(newPayment);
});

module.exports = router;