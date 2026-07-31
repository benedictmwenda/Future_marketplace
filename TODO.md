# Buyer Authentication Enforcement - Implementation Plan

## Tasks

### 1. Update `js/sokohub-auth.js`
- [x] Add "Add to Cart" button click interception for buyer login
- [x] Add cart page navigation interception for buyer login
- [x] Add checkout page navigation interception for buyer login
- [x] Add wishlist interception for buyer login

### 2. Add Guard to `shoping-cart.html`
- [x] Add immediate auth guard script at top of page
- [x] Redirect unauthenticated users to login page

### 3. Add Guard to `checkout.html`
- [x] Add immediate auth guard script at top of page
- [x] Redirect unauthenticated users to login page

### 4. Add Guard to `shop-details.html`
- [x] Add immediate auth guard for purchase/contact actions
- [x] Intercept Add to Cart button clicks

### 5. Review `login.html`
- [x] Already handles `redirect` and `role` URL params correctly

