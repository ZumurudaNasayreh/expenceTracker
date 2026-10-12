// Expense Tracker - frontend logic
// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.
//
// A possible structure (change it if you have a better idea):
//   - async function getExpenses()          fetch(API_URL), return the JSON
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
//
// Don't forget:
//   - Show a Bootstrap spinner while a request is in flight.
//   - Wrap every fetch call in try/catch, and show a Bootstrap alert on failure.
//   - After add, edit, or delete, call refresh() so the page always shows
//     what the server actually saved - never update the table by hand.
//   - The API is at http://localhost:3000/api/expenses (see the Roadmap).

const API_URL = "http://localhost:3000/api/expenses";
//DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expenseBodyTable = document.getElementById('expenseBodyTable');
const categorySelect = document.getElementById('categorySelect'); //appove table

// Cards
const totalCard = document.getElementById('total');
const numOfExpensesCard = document.getElementById('NumOfExpenses');
const highestExpenseCard = document.getElementById('HighestExpense');
const highestExpenseTitleCard = document.getElementById('HighestExpenseTitle');

//Modal Spinner Alter
const editModalEl = document.getElementById('editModal');
const editModal = new bootstrap.Modal(editModalEl); //to give the modal the ability to open and close it
const editExpenseForm = document.getElementById('editExpenseForm'); //form in modal
const loadingSpinner = document.getElementById('loadingSpinner');
const alertContainer = document.getElementById('alertContainer');

//come from server to use it in filters or op
let allExpenses = [];

// Spinner hide && show
function showSpinner() {
  if (loadingSpinner)
     loadingSpinner.classList.remove('d-none');
}
function hideSpinner() {
  if (loadingSpinner)
     loadingSpinner.classList.add('d-none');
}

// Alert con+des use everywhere to show the alert message in the page
function showAlert(message, type = 'danger') {
  if (!alertContainer) 
    return;
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// Alert use before new order to clear the old one
function clearAlert() {
  if (alertContainer) 
    alertContainer.innerHTML = '';
}

//badge related to category in table to give it color based on category
function getCategoryBadgeClass(category) {
  switch (category?.toLowerCase()) {
    case 'food':
       return 'bg-success';
    case 'Transport': 
      return 'bg-secondary text-white';
    case 'entertainment': 
      return 'bg-warning text-dark';
    case 'bills':
       return 'bg-danger';
    default:
       return 'bg-secondary text-white';
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                          GET Request
/////////////////////////////////////////////////////////////////////////////////////////////////////////
async function fetchExpenses() {
  showSpinner();
  clearAlert();
  try {
      const response = await fetch(API_URL);
      if (!response.ok){
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to retrieve data from the server');
      }
      allExpenses = await response.json();
      updateSummary(allExpenses);
      filterAndRenderExpenses();
  }
  catch (error)
  {
      showAlert(error.message);
  } 
  finally {
      hideSpinner();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                          Summary Cards
/////////////////////////////////////////////////////////////////////////////////////////////////////////

function updateSummary(expenses) { //allExpenses ==> arrayOfObj i can use(.)
  if (!expenses || expenses.length === 0) {
      totalCard.textContent = '0.00';
      numOfExpensesCard.textContent = '0';
      highestExpenseCard.textContent = '0.00';
      highestExpenseTitleCard.textContent = '-';
      return;
  }
  //total amount of all expenses
  let total = 0;
  expenses.forEach(item => {
    total += Number(item.amount);
  });
  totalCard.textContent = total.toFixed(2); //return str not num,, Specify the number after point
  // num of expenses
  numOfExpensesCard.textContent = expenses.length;
  // highest expense
  let highest = expenses[0];
  expenses.forEach(item => {
    if (Number(item.amount) > Number(highest.amount)) {
      highest = item;
    }
  });
  highestExpenseCard.textContent = Number(highest.amount).toFixed(2);
  highestExpenseTitleCard.textContent = highest.title;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////                                  filter and view in table
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//purpos : specific filter related what user choose
function filterAndRenderExpenses() {
  const selectedCategory = categorySelect.value;
  //ternary op
  const filtered = selectedCategory === 'All' 
    ? allExpenses 
    : allExpenses.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());
  renderTable(filtered);
}
//use this filter  and show in table 
function renderTable(expenses) {
  expenseBodyTable.innerHTML = '';

  if (expenses.length === 0) {
    expenseBodyTable.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">There are no expenses to display</td>
      </tr>
    `;
    return;
  }

  expenses.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-semibold">${item.title}</td>
      <td>$${Number(item.amount).toFixed(2)}</td>
      <td>
        <span class="badge ${getCategoryBadgeClass(item.category)}">
          ${item.category}
        </span>
      </td>
      <td>${item.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal('${item.id}')">
          Edit
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${item.id}')">
          Delete
        </button>
      </td>
    `;
    expenseBodyTable.appendChild(tr);
  });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                            POST Request
////////////////////////////////////////////////////////////////////////////////////////////////////////////
expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  //read data from form
  const title = document.getElementById('title').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;

  // Validation
  if (!title || isNaN(amount) || amount <= 0 || !category || !date) {
    showAlert('Ooops your data is failed ....Please enter correct data and an amount greater than zero');
    return;
  }

  const newExpense = { title, amount, category, date };

  showSpinner();
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },//serverrr the data come is json
      body: JSON.stringify(newExpense)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'failed to add the project');
    }
    // Resetting fields in front
    expenseForm.reset();
    
    // Update data directly from the server
    await fetchExpenses();

  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                PUT
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
function openEditModal(id) { //call in renderTable if click
  const item = allExpenses.find(e => e.id == id);
  if (!item) 
    return;
  //fill filed in modal before edit any item
  document.getElementById('editId').value = item.id;
  document.getElementById('editTitle').value = item.title;
  document.getElementById('editAmount').value = item.amount;
  document.getElementById('editCategory').value = item.category;
  document.getElementById('editDate').value = item.date;
  editModal.show();
}

editExpenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();//prevent auto refresh 
  clearAlert();
  //after edit feild and enter a submit
  const id = document.getElementById('editId').value;
  const updatedExpense = {
    title: document.getElementById('editTitle').value.trim(),
    amount: parseFloat(document.getElementById('editAmount').value),
    category: document.getElementById('editCategory').value,
    date: document.getElementById('editDate').value
  };

  showSpinner();
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedExpense) //to json form obj
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'failed to modify the expense');
    }

    editModal.hide();
    await fetchExpenses();

  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                              DELETE
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?'))
     return;

  clearAlert();
  showSpinner();

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'failed to delete the expense');
    }

    await fetchExpenses();

  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                          Events & Initialization
////////////////////////////////////////////////////////////////////////////////////////////////////////

categorySelect.addEventListener('change', filterAndRenderExpenses);

// load data when open page quickly without waiting for user action
document.addEventListener('DOMContentLoaded', fetchExpenses);


////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                          Theme Switcher
////////////////////////////////////////////////////////////////////////////////////////////////////////

// ---   Select DOM Elements   ---
const themeSwitcher = document.getElementById('themeSwitcher'); //to change text when choose light or dark
const themeOptions = document.querySelectorAll('.themeOption');

//read theme saved in browser localStorage and apply it (when refresh or when open the page again)
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-bs-theme', savedTheme);

// update text button
const activeOption = document.getElementById(savedTheme);
if (activeOption) {
  themeSwitcher.textContent = activeOption.textContent;
}

// add event listeners to each theme option (to select light or dark)
themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    const selectedTheme = option.id; // light أو dark

    // apply new theme to html tag (all page)
    document.documentElement.setAttribute('data-bs-theme', selectedTheme);

    //localStorage to save selected theme in browser to keep it when refresh the page or open again
    localStorage.setItem('theme', selectedTheme);

   //to change text in origin button (change selected theme name in button to dark or light)
    themeSwitcher.textContent = option.textContent;
  });
});