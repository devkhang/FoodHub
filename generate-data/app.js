const axios = require('axios');

/**
 * Generates and registers N users via API
 * @param {number} n - Number of users to create
 * @param {string} baseUsername - Prefix for the email (e.g., "testuser")
 * @param {number} startNum - Starting number to append (e.g., 10)
 * @param {string} password - The password for all accounts
 */
async function bulkRegisterUsers(n, baseUsername, startNum, password) {
  const apiUrl = 'https://foodhub-6342.onrender.com/auth/signup-user'; // Update with your actual endpoint
  
  console.log(`Starting generation of ${n} users...`);

  for (let i = 0; i < n; i++) {
    const currentNum = startNum + i;
    const userPayload = {
      email: `${baseUsername}${currentNum}@gmail.com`,
      firstName: `${baseUsername}`,
      lastName: `${currentNum}`,
      role: "ROLE_USER",
      password: password,
      confirmPassword: password
    };

    try {
      const response = await axios.post(apiUrl, userPayload);
      console.log(`Success: Created ${userPayload.email} (Status: ${response.status})`);
    } catch (error) {
      console.error(`Failed: ${userPayload.email} - ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log('Done!');
}

// Example Usage:
// This will create user10@gmail.com, user11@gmail.com, and user12@gmail.com
bulkRegisterUsers(40, 'load-test', 1, '12345678');