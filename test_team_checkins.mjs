async function run() {
  console.log('Testing team checkins...');
  // 1. Log in as John D'Souza
  let res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john.dsouza@atomquest.com', password: 'Manager@123' })
  });
  const loginData = await res.json();
  const token = loginData.data.token;
  console.log('Logged in as manager.');

  // 2. Fetch team checkins for Q1
  res = await fetch('http://localhost:4000/api/v1/checkins/team?quarter=Q1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const q1Data = await res.json();
  console.log('Q1 Checkins length:', q1Data.data.length);

  // 3. Look for Sarah's checkin
  const sarah = q1Data.data.find(d => d.employee.email === 'sarah.mehta@atomquest.com');
  console.log('Sarah Q1 checkin manager comment:', sarah.checkIn?.managerComment);

  // 4. Try updating the comment
  if (sarah.checkIn) {
    console.log('Adding comment to Sarah Q1 checkin...');
    res = await fetch(`http://localhost:4000/api/v1/checkins/${sarah.checkIn.id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ comment: 'Updated diagnostic comment for testing.' })
    });
    const updated = await res.json();
    console.log('Update result:', updated);

    res = await fetch('http://localhost:4000/api/v1/checkins/team?quarter=Q1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const finalData = await res.json();
    const sarahFinal = finalData.data.find(d => d.employee.email === 'sarah.mehta@atomquest.com');
    console.log('Sarah final manager comment:', sarahFinal.checkIn?.managerComment);
  } else {
    console.log('No checkin found for Sarah in Q1.');
  }
}

run().catch(console.error);
