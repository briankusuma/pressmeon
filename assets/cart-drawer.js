    // new

    /**
     * Optimized Cart Implementation
     * - Works for both cart drawer and cart page
     * - Synchronizes updates between cart drawer and cart page
     * - Preserves tax-include text when updating cart
     */

    // Original open/close functions
    function openCartDrawer() {
        document.querySelector(".cart-drawer").classList.add("open");
    }

    function closeCartDrawer() {
        document.querySelector(".cart-drawer").classList.remove("open");
    }

    // Update cart count badges
    function updateCartItemCounts(count) {
        document.querySelectorAll(".cart-count").forEach((el) => {
        el.textContent = count;
        });
    }

    // Check if we're on the cart page
    function isCartPage() {
        return window.location.pathname === '/cart' || 
            window.location.pathname.includes('/cart');
    }

    // Refresh only cart items without affecting other elements like tax-include text
    async function refreshCartItems() {
        if (!isCartPage()) return;
        
        console.log("Refreshing cart items...");
        
        try {
        // Store tax-include text before updating
        const taxIncludeElement = document.querySelector('.text-tax');
        const taxIncludeText = taxIncludeElement ? taxIncludeElement.innerHTML : '';
        console.log("Saved tax include text:", taxIncludeText);
        
        // Fetch updated cart data
        const cartResponse = await fetch('/cart.js');
        if (!cartResponse.ok) {
            throw new Error(`HTTP error! Status: ${cartResponse.status}`);
        }
        const cart = await cartResponse.json();
        
        // Fetch updated cart section
        const response = await fetch('?section_id=main-cart-items');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const html = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Update cart items
        const newCartMain = tempDiv.querySelector('.cart-main');
        const cartMain = document.querySelector('.cart-main');
        if (newCartMain && cartMain) {
            cartMain.innerHTML = newCartMain.innerHTML;
        }
        
        // Update summary totals without replacing the entire summary
        const summaryItems = document.querySelectorAll('.cart-summary-item');
        if (summaryItems.length >= 3) {
            // Format currency based on Shopify's money format
            const formatMoney = (cents) => {
            return (cents/100).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            };
            
            // Update subtotal
            const subtotalElement = summaryItems[0].querySelector('span:last-child');
            if (subtotalElement) subtotalElement.textContent = formatMoney(cart.original_total_price);
            
            // Update discount
            const discountElement = summaryItems[1].querySelector('span:last-child');
            if (discountElement) discountElement.textContent = formatMoney(cart.total_discount);
            
            // Update total
            const totalElement = summaryItems[2].querySelector('span:last-child');
            if (totalElement) totalElement.textContent = formatMoney(cart.items_subtotal_price);
        }
        
        // Restore tax-include text
        if (taxIncludeText) {
            const newTaxIncludeElement = document.querySelector('.text-tax');
            if (newTaxIncludeElement) {
            newTaxIncludeElement.innerHTML = taxIncludeText;
            console.log("Restored tax include text");
            }
        }
        
        console.log("Cart items refreshed successfully");
        
        // Re-attach event listeners to the new elements
        setupCartPageListeners();
        } catch (error) {
        console.error("Error refreshing cart items:", error);
        }
    }

    // Simplified cart drawer update function
    async function updateCartDrawer() {
        console.log("Updating cart drawer...");
        try {
        const res = await fetch("/?section_id=cart-drawer");
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        
        const text = await res.text();
        const html = document.createElement("div");
        html.innerHTML = text;

        const newContent = html.querySelector(".cart-drawer")?.innerHTML;
        if (newContent) {
            document.querySelector(".cart-drawer").innerHTML = newContent;
            console.log("Cart drawer updated successfully");
            addCartDrawerListeners();
        } else {
            console.error("Could not find .cart-drawer in the fetched HTML");
        }
        } catch (error) {
        console.error("Error updating cart drawer:", error);
        }
    }

    // Update both cart drawer and cart page
    async function updateAllCarts() {
        await updateCartDrawer();
        // Use refreshCartItems instead of refreshCartPage to preserve tax-include text
        await refreshCartItems();
    }

    // Update quantity with optimized approach - works for both cart drawer and cart page
    async function updateQuantity(key, quantity) {
        if (!key) {
        console.error('Missing line item key for quantity update');
        return;
        }
        
        console.log(`Updating quantity for ${key} to ${quantity}`);
        
        // Show loading state on all elements with this key
        document.querySelectorAll(`[data-key="${key}"], [data-line-item-key="${key}"]`).forEach(el => {
        el.classList.add('updating');
        });
        
        try {
        // Update cart
        const res = await fetch("/cart/update.js", {
            method: "POST",
            headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
            },
            body: JSON.stringify({ updates: { [key]: quantity } })
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error("Update quantity response not OK:", res.status, errorText);
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        const cart = await res.json();
        console.log("Cart updated:", cart);
        
        // Update cart count badges
        updateCartItemCounts(cart.item_count);
        
        // Update both cart drawer and cart page
        await updateAllCarts();
        
        return cart;
        } catch (error) {
        console.error('Failed to update quantity:', error);
        alert("Gagal mengubah jumlah produk: " + error.message);
        } finally {
        // Remove loading state
        document.querySelectorAll(`[data-key="${key}"], [data-line-item-key="${key}"]`).forEach(el => {
            el.classList.remove('updating');
        });
        }
    }

    // Simplified add to cart function
    async function addToCart(form) {
        console.log("Adding to cart...", form);
        
        // Disable submit button
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        }
        
        try {
        // Create FormData from the form
        const formData = new FormData(form);
        
        // Log form data for debugging
        console.log("Form data entries:");
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        // Use /cart/add.js
        const response = await fetch("/cart/add.js", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Add to cart response not OK:", response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Add to cart successful:", result);
        
        // Get updated cart count
        const cartResponse = await fetch("/cart.js");
        const cart = await cartResponse.json();
        console.log("Updated cart:", cart);
        updateCartItemCounts(cart.item_count);
        
        // Update both cart drawer and cart page
        await updateAllCarts();
        
        // Open cart drawer
        openCartDrawer();
        
        return true;
        } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Gagal menambahkan produk ke keranjang: " + error.message);
        return false;
        } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
        }
    }

    // Handle quantity buttons (works for both cart drawer and cart page)
    function handleQuantityButton(button) {
        console.log("Quantity button clicked:", button.className);
        
        // Disable button during processing
        button.disabled = true;
        
        try {
        // Get key from data-key attribute
        const key = button.getAttribute("data-key");
        if (!key) {
            console.error('Missing data-key attribute on button');
            return;
        }
        
        console.log("Item key from button:", key);
        
        // Find the quantity input
        let input;
        
        // Try different approaches to find the input
        // 1. Look in the same product-quantity container
        const quantityContainer = button.closest('.product-quantity');
        if (quantityContainer) {
            input = quantityContainer.querySelector('.quantity-input');
        }
        
        // 2. If not found, look for input with name="updates[key]"
        if (!input) {
            input = document.querySelector(`input[name="updates[${key}]"]`);
        }
        
        // 3. If still not found, look for any nearby input
        if (!input) {
            const parentItem = button.closest('[data-line-item-key], [data-key]');
            if (parentItem) {
            input = parentItem.querySelector('input[type="number"], input.quantity-input');
            }
        }
        
        if (!input) {
            console.error('Could not find quantity input');
            return;
        }
        
        const currentQuantity = Number(input.value) || 0;
        const isIncrement = button.classList.contains("increment");
        const newQuantity = Math.max(0, isIncrement ? currentQuantity + 1 : currentQuantity - 1);
        
        console.log(`Updating quantity from ${currentQuantity} to ${newQuantity}`);
        
        // Update UI immediately for better UX
        input.value = newQuantity;
        
        // Update cart
        updateQuantity(key, newQuantity);
        } catch (error) {
        console.error('Error handling quantity change:', error);
        alert("Gagal mengubah jumlah produk: " + error.message);
        } finally {
        button.disabled = false;
        }
    }

    // Setup event listeners for cart drawer
    function addCartDrawerListeners() {
        console.log("Setting up cart drawer listeners");
        
        // Handle increment/decrement buttons in cart drawer
        document.querySelectorAll(".cart-drawer .increment, .cart-drawer .decrement").forEach((button) => {
        button.addEventListener("click", () => handleQuantityButton(button));
        });
        
        // Handle quantity input changes in cart drawer
        document.querySelectorAll(".cart-drawer .quantity-input").forEach((input) => {
        input.addEventListener("change", async () => {
            try {
            // Get key from input name or nearby button
            let key;
            
            // Try to get from name attribute: updates[key]
            const nameMatch = input.name.match(/updates\[(.*?)\]/);
            if (nameMatch && nameMatch[1]) {
                key = nameMatch[1];
            } else {
                // Try to get from nearby button
                const nearbyButton = input.closest('.product-quantity')?.querySelector('[data-key]');
                if (nearbyButton) {
                key = nearbyButton.getAttribute('data-key');
                }
            }
            
            if (!key) {
                console.error('Could not determine item key for quantity input');
                return;
            }
            
            console.log("Item key for input:", key);
            
            const newQuantity = Math.max(0, Number(input.value) || 0);
            
            // Update cart
            updateQuantity(key, newQuantity);
            } catch (error) {
            console.error('Error handling quantity input change:', error);
            }
        });
        });
        
        // Handle remove links in cart drawer
        document.querySelectorAll(".cart-drawer .cart-remove").forEach((link) => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("Remove link clicked");
            
            try {
            // Try different approaches to get the key
            let key;
            
            // 1. Try to get from parent element
            const parentItem = link.closest('[data-line-item-key]');
            if (parentItem) {
                key = parentItem.getAttribute('data-line-item-key');
            } 
            // 2. Try to get from nearby button
            else {
                const nearbyButton = link.closest('.drawer-cart-items')?.querySelector('[data-key]');
                if (nearbyButton) {
                key = nearbyButton.getAttribute('data-key');
                }
            }
            
            if (!key) {
                console.error('Could not determine item key for remove link');
                // Fallback to href
                window.location.href = link.getAttribute('href');
                return;
            }
            
            console.log("Removing item with key:", key);
            
            // Remove item by setting quantity to 0
            updateQuantity(key, 0);
            } catch (error) {
            console.error('Error removing item:', error);
            alert("Gagal menghapus produk: " + error.message);
            }
        });
        });
        
        // Close drawer with close button
        const closeButton = document.getElementById('close-drawer');
        if (closeButton) {
        closeButton.addEventListener("click", () => {
            console.log("Close button clicked");
            closeCartDrawer();
        });
        } else {
        console.warn("Close button not found");
        }
        
        // Prevent drawer content clicks from closing the drawer
        const drawer = document.querySelector('.drawer');
        if (drawer) {
        drawer.addEventListener('click', e => {
            e.stopPropagation();
        });
        } else {
        console.warn("Drawer content element not found");
        }
    }

    // Setup event listeners for cart page
    function setupCartPageListeners() {
        console.log("Setting up cart page listeners");
        
        // Handle increment/decrement buttons on cart page
        document.querySelectorAll("form[action='/cart'] .increment, form[action='/cart'] .decrement").forEach((button) => {
        button.addEventListener("click", () => handleQuantityButton(button));
        });
        
        // Handle quantity input changes on cart page
        document.querySelectorAll("form[action='/cart'] .quantity-input").forEach((input) => {
        input.addEventListener("change", async () => {
            try {
            // Get key from input name or nearby button
            let key;
            
            // Try to get from name attribute: updates[key]
            const nameMatch = input.name.match(/updates\[(.*?)\]/);
            if (nameMatch && nameMatch[1]) {
                key = nameMatch[1];
            } else {
                // Try to get from nearby button
                const nearbyButton = input.closest('.product-quantity')?.querySelector('[data-key]');
                if (nearbyButton) {
                key = nearbyButton.getAttribute('data-key');
                }
            }
            
            if (!key) {
                console.error('Could not determine item key for quantity input');
                return;
            }
            
            console.log("Item key for input:", key);
            
            const newQuantity = Math.max(0, Number(input.value) || 0);
            
            // Update cart
            updateQuantity(key, newQuantity);
            } catch (error) {
            console.error('Error handling quantity input change:', error);
            }
        });
        });
        
        // Handle remove links on cart page
        document.querySelectorAll("form[action='/cart'] .cart-remove").forEach((link) => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("Remove link clicked on cart page");
            
            try {
            // Try different approaches to get the key
            let key;
            
            // 1. Try to get from parent element
            const parentItem = link.closest('[data-line-item-key]');
            if (parentItem) {
                key = parentItem.getAttribute('data-line-item-key');
            } 
            // 2. Try to get from nearby button
            else {
                const nearbyButton = link.closest('tr, .cart-item')?.querySelector('[data-key]');
                if (nearbyButton) {
                key = nearbyButton.getAttribute('data-key');
                }
            }
            
            if (!key) {
                console.error('Could not determine item key for remove link');
                // Fallback to href
                window.location.href = link.getAttribute('href');
                return;
            }
            
            console.log("Removing item with key:", key);
            
            // Remove item by setting quantity to 0
            updateQuantity(key, 0);
            } catch (error) {
            console.error('Error removing item:', error);
            alert("Gagal menghapus produk: " + error.message);
            }
        });
        });
    }

    // Setup global event listeners
    function setupGlobalEventListeners() {
        console.log("Setting up global event listeners");
        
        // Add to cart forms
        document.querySelectorAll('form[action="/cart/add"]').forEach((form) => {
        console.log("Found add to cart form:", form);
        
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Form submitted:", e.target);
            
            await addToCart(form);
        });
        });
        
        // Cart links
        document.querySelectorAll('a[href="/cart"]').forEach((a) => {
        a.addEventListener("click", (e) => {
            // Check if this is the View Cart button or go-to-cart link
            const isViewCartButton = a.classList.contains('view-cart') || 
                                    a.classList.contains('go-to-cart') ||
                                    a.textContent?.trim().toLowerCase().includes('view cart') ||
                                    a.getAttribute('data-action') === 'view-cart';
            
            // If it's the View Cart button or we're already on the cart page, allow normal navigation
            if (isViewCartButton || isCartPage()) {
            console.log("View Cart button clicked or already on cart page - navigating to cart page");
            return; // Allow default behavior (navigation to /cart)
            } else {
            // For other cart links, open the drawer
            e.preventDefault();
            console.log("Cart link clicked - opening drawer");
            openCartDrawer();
            }
        });
        });
    }

    // Add CSS for loading states
    function addLoadingStyles() {
        if (document.getElementById('cart-drawer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cart-drawer-styles';
        style.textContent = `
        .cart-drawer--active {
            display: block;
            opacity: 1;
            visibility: visible;
        }
        
        .loading, .updating {
            opacity: 0.7;
            pointer-events: none;
            position: relative;
        }
        
        .loading::after, .updating::after {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            margin: -10px 0 0 -10px;
            border: 2px solid rgba(0,0,0,0.2);
            border-top-color: #000;
            border-radius: 50%;
            animation: cart-spinner 0.6s linear infinite;
        }
        
        @keyframes cart-spinner {
            to { transform: rotate(360deg); }
        }
        `;
        document.head.appendChild(style);
    }

    // Initialize
    function initCart() {
        console.log("Initializing cart system");
        addLoadingStyles();
        
        // Setup listeners for both cart drawer and cart page
        addCartDrawerListeners();
        setupCartPageListeners();
        setupGlobalEventListeners();
        
        // Get initial cart count
        fetch('/cart.js')
        .then(res => res.json())
        .then(cart => {
            console.log('Initial cart state:', cart);
            updateCartItemCounts(cart.item_count);
        })
        .catch(err => console.error('Error fetching initial cart state:', err));
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCart);
    } else {
        initCart();
    }

    // Keep the existing go-to-cart handler
    document.querySelectorAll('.go-to-cart').forEach((a) => {
        a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = "/cart"
        })
    })