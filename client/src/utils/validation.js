export function validateRegister({ name, email, phone, password, role, businessName }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) errors.email = 'Enter a valid email.';
  if (!/^[6-9]\d{9}$/.test(phone || '')) errors.phone = 'Enter a 10-digit mobile number.';
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Use at least 8 characters with a letter and a number.';
  }
  if (!['customer', 'provider'].includes(role)) errors.role = 'Choose an account type.';
  if (role === 'provider' && businessName && businessName.trim().length < 2) {
    errors.businessName = 'Enter the business name.';
  }
  return errors;
}

export function validateBookingDetails({ scheduledDate, startTime, address, issueDescription, paymentMethod }) {
  const errors = {};
  if (!scheduledDate) errors.scheduledDate = 'Choose a date.';
  if (!startTime) errors.startTime = 'Choose an available time.';
  if (!address?.line1 || address.line1.trim().length < 3) errors.line1 = 'Enter the service address.';
  if (!address?.city) errors.city = 'Enter the city.';
  if (!address?.state) errors.state = 'Enter the state.';
  if (!address?.pincode || address.pincode.trim().length < 4) errors.pincode = 'Enter the PIN code.';
  if (!issueDescription || issueDescription.trim().length < 10) {
    errors.issueDescription = 'Describe the issue in at least 10 characters.';
  }
  if (!['cod', 'razorpay', 'dev_simulator'].includes(paymentMethod)) errors.paymentMethod = 'Choose how you will pay.';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
