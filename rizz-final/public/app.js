/* =========================
   GLOBAL VARIABLES
========================= */

const app = document.querySelector('#app');

let products = [];

let cart = JSON.parse(
  localStorage.getItem('rizz_cart') || '[]'
);

let me = null;

let config = {};


/* =========================
   UTILITY FUNCTIONS
========================= */

const money = n =>
  `₹${Number(n).toLocaleString('en-IN')}`;

const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );


/* =========================
   TOAST MESSAGE
========================= */

function toast(m) {
  const t = document.querySelector('#toast');

  t.textContent = m;

  t.classList.add('show');

  setTimeout(
    () => t.classList.remove('show'),
    2600
  );
}


/* =========================
   CART
========================= */

function saveCart() {
  localStorage.setItem(
    'rizz_cart',
    JSON.stringify(cart)
  );

  document.querySelector('#cartCount').textContent =
    cart.reduce(
      (a, x) => a + x.quantity,
      0
    );
}


/* =========================
   API
========================= */

async function api(url, opt = {}) {
  const r = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(opt.headers || {})
    },
    ...opt
  });

  let d = {};

  try {
    d = await r.json();
  } catch {}

  if (!r.ok) {
    throw new Error(
      d.error || 'Something went wrong'
    );
  }

  return d;
}


/* =========================
   INITIALIZATION
========================= */

async function init() {
  config = await api('/api/config');

  try {
    me = (
      await api('/api/auth/me')
    ).user;
  } catch {}

  saveCart();

  route();
}


/* =========================
   ROUTING
========================= */

function route() {
  const h = location.hash || '#home';

  if (h.startsWith('#product/')) {
    return productPage(
      h.split('/')[1]
    );
  }

  if (
    h === '#shop' ||
    h.startsWith('#shop?')
  ) {
    return shopPage();
  }

  if (h === '#cart') {
    return cartPage();
  }

  if (h === '#checkout') {
    return checkoutPage();
  }

  if (h === '#login') {
    return authPage(false);
  }

  if (h === '#register') {
    return authPage(true);
  }

  if (
    h === '#account' ||
    h === '#orders'
  ) {
    return ordersPage();
  }

  if (h === '#admin') {
    return adminRedirect();
  }

  return homePage();
}


/* =========================
   HEADER BUTTONS
========================= */

window.addEventListener(
  'hashchange',
  route
);

document.querySelector(
  '#cartBtn'
).onclick = () => {
  location.hash = '#cart';
};

document.querySelector(
  '#accountBtn'
).onclick = () => {
  location.hash = me
    ? '#orders'
    : '#login';
};

document.querySelector(
  '#menuBtn'
).onclick = () => {
  toast(
    'Use the category links on desktop; mobile navigation is coming next.'
  );
};


/* =========================
   HOME PAGE
========================= */

function homePage() {

  app.innerHTML = `
    <section class="hero">

      <div class="hero-copy">

        <span class="eyebrow">
          Rizz Fashion House
        </span>

        <h1>
          What if
          <br>
          <em>fashion</em>
          <br>
          flirts?
        </h1>

        <p>
          Discover a royal wardrobe built around
          confident silhouettes, quiet luxury
          and modern attitude.
        </p>

        <div>
          <a
            class="btn light"
            href="#shop"
          >
            Shop the collection
          </a>
        </div>

      </div>

      <div class="hero-img">
  <div class="hero-coming-soon">
    <span class="coming-label">Rizz Fashion House</span>
    <h2>Coming<br><em>Soon.</em></h2>
    <p>A new collection is getting ready to flirt with your wardrobe.</p>
  </div>
</div>


    </section>


    <section class="section">

      <div class="section-head">

        <div>

          <span class="eyebrow">
            The Edit
          </span>

          <h2>
            Designed to be noticed.
          </h2>

        </div>

        <a
          href="#shop"
          class="btn"
        >
          View all
        </a>

      </div>


      <div class="categories">

        ${
          [
            [
              'shirts',
              'Shirts',
              'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?auto=format&fit=crop&w=900&q=85'
            ],
            [
              'pants',
              'Pants',
              'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85'
            ],
            [
              't-shirts',
              'T-Shirts',
              'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85'
            ],
            [
              'dresses',
              'Dresses',
              'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85'
            ]
          ]
            .map(
              x => `
                <a
                  class="cat"
                  href="#shop?cat=${x[0]}"
                  style="background-image:url('${x[2]}')"
                >

                  <div>

                    <span class="eyebrow">
                      Collection
                    </span>

                    <h3>
                      ${x[1]}
                    </h3>

                    <small>
                      Explore →
                    </small>

                  </div>

                </a>
              `
            )
            .join('')
        }

      </div>

    </section>


    <section
      class="section"
      style="background:#f1eee7"
    >

      <div class="section-head">

        <div>

          <span class="eyebrow">
            New Arrivals
          </span>

          <h2>
            The latest Rizz.
          </h2>

        </div>

      </div>

      <div
        id="homeProducts"
        class="products"
      ></div>

    </section>
  `;

  loadProducts(
    '/api/products?sort=featured',
    '#homeProducts',
    4
  );
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts(
  url,
  selector,
  limit
) {
  try {

    const d = await api(url);

    products = d;

    if (limit) {
      d = d.slice(0, limit);
    }

    document.querySelector(
      selector
    ).innerHTML = d
      .map(card)
      .join('');

  } catch (e) {

    toast(e.message);

  }
}


/* =========================
   PRODUCT CARD
========================= */

function card(p) {

  return `
    <article class="product-card">

      <a href="#product/${p.id}">

        <div class="product-img">

          <img
            src="${esc(p.image)}"
            alt="${esc(p.name)}"
          >

        </div>


        <div class="product-info">

          <div class="meta">
            ${esc(p.category)}
          </div>

          <h3>
            ${esc(p.name)}
          </h3>

          <div class="price">
            ${money(p.price)}
          </div>

          <div
            class="stock ${p.stock ? '' : 'out'}"
          >
            ${
              p.stock
                ? `${p.stock} available`
                : 'Out of stock'
            }
          </div>

        </div>

      </a>

    </article>
  `;
}


/* =========================
   SHOP PAGE
========================= */

async function shopPage() {

  const params =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const cat =
    params.get('cat') || '';


  app.innerHTML = `
    <section class="section">

      <div class="section-head">

        <div>

          <span class="eyebrow">
            Rizz Collection
          </span>

          <h2>
            Shop all.
          </h2>

        </div>

      </div>


      <div class="filters">

        <input
          id="search"
          placeholder="Search the collection…"
        >


        <button
          class="filter ${!cat ? 'active' : ''}"
          data-cat=""
        >
          All
        </button>


        ${
          [
            'shirts',
            'pants',
            't-shirts',
            'dresses'
          ]
            .map(
              c => `
                <button
                  class="filter ${
                    cat === c ? 'active' : ''
                  }"
                  data-cat="${c}"
                >
                  ${c.replace('-', ' ')}
                </button>
              `
            )
            .join('')
        }


        <select id="sort">

          <option value="featured">
            Featured
          </option>

          <option value="price-asc">
            Price: low to high
          </option>

          <option value="price-desc">
            Price: high to low
          </option>

        </select>

      </div>


      <div
        id="shopProducts"
        class="products"
      ></div>

    </section>
  `;


  const load = () => {

    const s =
      document.querySelector(
        '#search'
      ).value;

    const sort =
      document.querySelector(
        '#sort'
      ).value;

    loadProducts(
      `/api/products?category=${encodeURIComponent(cat)}&search=${encodeURIComponent(s)}&sort=${sort}`,
      '#shopProducts'
    );
  };


  document
    .querySelectorAll('.filter')
    .forEach(
      b => {
        b.onclick = () => {
          location.hash = b.dataset.cat
            ? `#shop?cat=${b.dataset.cat}`
            : '#shop';
        };
      }
    );


  document.querySelector(
    '#search'
  ).oninput = load;


  document.querySelector(
    '#sort'
  ).onchange = load;


  load();
}


/* =========================
   PRODUCT PAGE
========================= */

async function productPage(id) {

  try {

    const p =
      await api(
        '/api/products/' + id
      );

    let selected =
      p.sizes[0] || '';


    app.innerHTML = `
      <section class="section">

        <div class="detail">

          <div>

            <img
              src="${esc(p.image)}"
              alt="${esc(p.name)}"
            >

          </div>


          <div>

            <span class="eyebrow">
              ${esc(p.category)}
            </span>

            <h1>
              ${esc(p.name)}
            </h1>

            <div
              class="price"
              style="font-size:22px"
            >
              ${money(p.price)}
            </div>

            <p class="desc">
              ${esc(p.description)}
            </p>


            <h4>
              Select size / variant
            </h4>


            <div class="variants">

              ${
                p.sizes
                  .map(
                    (s, i) => `
                      <button
                        class="variant ${
                          i === 0
                            ? 'active'
                            : ''
                        }"
                        data-v="${esc(s)}"
                      >
                        ${esc(s)}
                      </button>
                    `
                  )
                  .join('')
              }

            </div>


            <div class="qty">

              <button id="minus">
                −
              </button>

              <span id="q">
                1
              </span>

              <button id="plus">
                +
              </button>

            </div>


            <div style="margin:25px 0">

              <button
                id="add"
                class="btn gold"
                ${p.stock ? '' : 'disabled'}
              >
                ${
                  p.stock
                    ? 'Add to bag'
                    : 'Out of stock'
                }
              </button>

            </div>


            <p class="muted">
              ${
                p.stock
                  ? `${p.stock} pieces currently available.`
                  : 'This item is currently unavailable.'
              }
            </p>

          </div>

        </div>

      </section>
    `;


    let q = 1;


    document
      .querySelectorAll('.variant')
      .forEach(
        b => {

          b.onclick = () => {

            selected =
              b.dataset.v;

            document
              .querySelectorAll('.variant')
              .forEach(
                x =>
                  x.classList.remove(
                    'active'
                  )
              );

            b.classList.add(
              'active'
            );
          };

        }
      );


    document.querySelector(
      '#minus'
    ).onclick = () => {

      q = Math.max(
        1,
        q - 1
      );

      document.querySelector(
        '#q'
      ).textContent = q;
    };


    document.querySelector(
      '#plus'
    ).onclick = () => {

      q = Math.min(
        p.stock,
        q + 1
      );

      document.querySelector(
        '#q'
      ).textContent = q;
    };


    document.querySelector(
      '#add'
    ).onclick = () => {

      const old =
        cart.find(
          x =>
            x.productId === p.id &&
            x.variant === selected
        );


      if (old) {

        old.quantity =
          Math.min(
            p.stock,
            old.quantity + q
          );

      } else {

        cart.push({
          productId: p.id,
          name: p.name,
          image: p.image,
          price: p.price,
          variant: selected,
          quantity: q
        });

      }


      saveCart();

      toast(
        'Added to your bag'
      );
    };

  } catch (e) {

    app.innerHTML = `
      <section class="section">

        <div class="panel">
          ${esc(e.message)}
        </div>

      </section>
    `;

  }
}


/* =========================
   CART PAGE
========================= */

function cartPage() {

  const total =
    cart.reduce(
      (a, x) =>
        a + x.price * x.quantity,
      0
    );


  app.innerHTML = `
    <section class="section">

      <div class="section-head">

        <div>

          <span class="eyebrow">
            Your selection
          </span>

          <h2>
            Shopping bag.
          </h2>

        </div>

      </div>


      ${
        cart.length
          ? cart
              .map(
                (x, i) => `
                  <div class="cart-row">

                    <img
                      src="${esc(x.image)}"
                      alt=""
                    >


                    <div>

                      <h3>
                        ${esc(x.name)}
                      </h3>

                      <div class="muted">
                        ${esc(x.variant)}
                        ·
                        ${money(x.price)}
                      </div>

                    </div>


                    <div class="qty">

                      <button
                        onclick="changeCart(${i},-1)"
                      >
                        −
                      </button>

                      <span>
                        ${x.quantity}
                      </span>

                      <button
                        onclick="changeCart(${i},1)"
                      >
                        +
                      </button>

                    </div>


                    <div class="price">

                      ${money(
                        x.price * x.quantity
                      )}

                      <button
                        onclick="removeCart(${i})"
                        style="border:0;background:none"
                      >
                        ×
                      </button>

                    </div>

                  </div>
                `
              )
              .join('')

          : `
              <div class="panel">

                <h3>
                  Your bag is waiting.
                </h3>

                <p class="muted">
                  Add a piece from the collection.
                </p>

                <a
                  class="btn"
                  href="#shop"
                >
                  Shop now
                </a>

              </div>
            `
      }


      ${
        cart.length
          ? `
              <div class="cart-summary">

                <div class="total-line">

                  <span>
                    Subtotal
                  </span>

                  <b>
                    ${money(total)}
                  </b>

                </div>


                <a
                  class="btn gold"
                  href="#checkout"
                  style="width:100%"
                >
                  Proceed to checkout
                </a>

              </div>
            `
          : ''
      }

    </section>
  `;
}


window.changeCart = (
  i,
  d
) => {

  cart[i].quantity += d;

  if (
    cart[i].quantity < 1
  ) {
    cart.splice(i, 1);
  }

  saveCart();

  cartPage();
};


window.removeCart = i => {

  cart.splice(i, 1);

  saveCart();

  cartPage();
};


/* =========================
   CHECKOUT PAGE
========================= */

async function checkoutPage() {

  if (!me) {

    toast(
      'Please log in before checkout'
    );

    location.hash = '#login';

    return;
  }


  if (!cart.length) {

    location.hash = '#cart';

    return;
  }


  app.innerHTML = `
    <section class="section">

      <div class="section-head">

        <div>

          <span class="eyebrow">
            Almost yours
          </span>

          <h2>
            Checkout.
          </h2>

        </div>

      </div>


      <div class="checkout">

        <div class="panel">

          <h3>
            Delivery details
          </h3>


          <form
            id="checkoutForm"
            class="form"
          >

            <div class="two">

              <div>

                <label>
                  Name
                </label>

                <input
                  id="name"
                  value="${esc(me.name)}"
                  required
                >

              </div>


              <div>

                <label>
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value="${esc(me.email)}"
                  required
                >

              </div>

            </div>


            <div>

              <label>
                Phone
              </label>

              <input
                id="phone"
                value="${esc(me.phone || '')}"
                required
              >

            </div>


            <div>

              <label>
                Address line
              </label>

              <textarea
                id="line1"
                required
              ></textarea>

            </div>


            <div class="two">

              <div>

                <label>
                  City
                </label>

                <input
                  id="city"
                  required
                >

              </div>


              <div>

                <label>
                  State
                </label>

                <input
                  id="state"
                  required
                >

              </div>

            </div>


            <div class="two">

              <div>

                <label>
                  Postal code
                </label>

                <input
                  id="postalCode"
                  required
                >

              </div>


              <div>

                <label>
                  Country
                </label>

                <input
                  id="country"
                  value="India"
                  required
                >

              </div>

            </div>


            <h3>
              Payment
            </h3>


            <div class="pay-options">

              <label class="pay-option">

                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked
                >

                Cash on Delivery

              </label>


              <label class="pay-option">

                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  ${config.razorpayEnabled ? '' : 'disabled'}
                >

                UPI

                ${
                  config.razorpayEnabled
                    ? ''
                    : '(configure Razorpay)'
                }

              </label>


              <label class="pay-option">

                <input
                  type="radio"
                  name="payment"
                  value="debit-card"
                  ${config.razorpayEnabled ? '' : 'disabled'}
                >

                Debit Card

                ${
                  config.razorpayEnabled
                    ? ''
                    : '(configure Razorpay)'
                }

              </label>


              <label class="pay-option">

                <input
                  type="radio"
                  name="payment"
                  value="credit-card"
                  ${config.razorpayEnabled ? '' : 'disabled'}
                >

                Credit Card

                ${
                  config.razorpayEnabled
                    ? ''
                    : '(configure Razorpay)'
                }

              </label>

            </div>


            <div class="notice">

              Card details are never stored by Rizz.
              Online payment is handled by the
              configured payment provider.

            </div>


            <button
              class="btn gold"
              type="submit"
            >
              Place order
            </button>

          </form>

        </div>


        <div class="panel">

          <h3>
            Order summary
          </h3>


          ${
            cart
              .map(
                x => `
                  <div class="total-line">

                    <span>

                      ${esc(x.name)}
                      × ${x.quantity}

                      <small class="muted">
                        ${esc(x.variant)}
                      </small>

                    </span>

                    <b>
                      ${money(
                        x.price * x.quantity
                      )}
                    </b>

                  </div>
                `
              )
              .join('')
          }


          <hr>


          <div class="total-line">

            <span>
              Total
            </span>

            <b>
              ${money(
                cart.reduce(
                  (a, x) =>
                    a + x.price * x.quantity,
                  0
                )
              )}
            </b>

          </div>

        </div>

      </div>

    </section>
  `;


  document.querySelector(
    '#checkoutForm'
  ).onsubmit = async e => {

    e.preventDefault();


    const payment =
      document.querySelector(
        'input[name=payment]:checked'
      ).value;


    try {

      const d = await api(
        '/api/orders',
        {
          method: 'POST',

          body: JSON.stringify({

            items: cart.map(
              x => ({
                productId: x.productId,
                quantity: x.quantity,
                variant: x.variant
              })
            ),

            customer: {
              name:
                document.querySelector(
                  '#name'
                ).value,

              email:
                document.querySelector(
                  '#email'
                ).value,

              phone:
                document.querySelector(
                  '#phone'
                ).value
            },

            address: {
              line1:
                document.querySelector(
                  '#line1'
                ).value,

              city:
                document.querySelector(
                  '#city'
                ).value,

              state:
                document.querySelector(
                  '#state'
                ).value,

              postalCode:
                document.querySelector(
                  '#postalCode'
                ).value,

              country:
                document.querySelector(
                  '#country'
                ).value
            },

            paymentMethod:
              payment
          })
        }
      );


      cart = [];

      saveCart();


      app.innerHTML = `
        <section class="section success">

          <div class="check">
            ✓
          </div>

          <span class="eyebrow">
            Order confirmed
          </span>

          <h1
            style="font:600 58px var(--serif)"
          >
            Thank you.
          </h1>

          <p>
            Your Rizz order
            <b>
              #${d.order.id}
            </b>
            has been placed.
          </p>

          <p class="muted">
            A confirmation is being sent to
            ${esc(d.order.customer_email)}.
          </p>

          <a
            class="btn"
            href="#orders"
          >
            View my orders
          </a>

        </section>
      `;

    } catch (e) {

      toast(e.message);

    }
  };
}


/* =========================
   LOGIN / REGISTER
========================= */

function authPage(register) {

  app.innerHTML = `
    <section class="section">

      <div class="auth panel">

        <span class="eyebrow">
          Rizz Account
        </span>


        <h2>
          ${
            register
              ? 'Create account'
              : 'Welcome back'
          }
        </h2>


        <form
          id="authForm"
          class="form"
        >

          ${
            register
              ? `
                  <div>

                    <label>
                      Name
                    </label>

                    <input
                      id="name"
                      required
                    >

                  </div>


                  <div>

                    <label>
                      Phone
                    </label>

                    <input
                      id="phone"
                    >

                  </div>
                `
              : ''
          }


          <div>

            <label>
              Email
            </label>

            <input
              id="email"
              type="email"
              required
            >

          </div>


          <div>

            <label>
              Password
            </label>

            <input
              id="password"
              type="password"
              minlength="6"
              required
            >

          </div>


          <button class="btn gold">
            ${
              register
                ? 'Register'
                : 'Login'
            }
          </button>

        </form>


        <p class="muted">

          ${
            register
              ? 'Already have an account?'
              : 'New to Rizz?'
          }

          <a
            href="${
              register
                ? '#login'
                : '#register'
            }"
          >
            <u>
              ${
                register
                  ? 'Login'
                  : 'Create one'
              }
            </u>
          </a>

        </p>

      </div>

    </section>
  `;


  document.querySelector(
    '#authForm'
  ).onsubmit = async e => {

    e.preventDefault();


    try {

      const d = await api(
        '/api/auth/' +
          (
            register
              ? 'register'
              : 'login'
          ),
        {
          method: 'POST',

          body: JSON.stringify({

            name:
              document.querySelector(
                '#name'
              )?.value,

            email:
              document.querySelector(
                '#email'
              ).value,

            phone:
              document.querySelector(
                '#phone'
              )?.value,

            password:
              document.querySelector(
                '#password'
              ).value

          })
        }
      );


      me = d.user;

      toast(
        'Welcome to Rizz'
      );

      location.hash = '#shop';

    } catch (e) {

      toast(e.message);

    }
  };
}


/* =========================
   ORDERS PAGE
========================= */

async function ordersPage() {

  if (!me) {

    location.hash = '#login';

    return;
  }


  const d =
    await api('/api/orders');


  app.innerHTML = `
    <section class="section">

      <div class="section-head">

        <div>

          <span class="eyebrow">
            Your account
          </span>

          <h2>
            My orders.
          </h2>

        </div>


        <button
          id="logout"
          class="btn"
        >
          Logout
        </button>

      </div>


      ${
        d.length

          ? d
              .map(
                o => `
                  <div class="order-card">

                    <div class="order-head">

                      <div>

                        <b>
                          Order #${o.id}
                        </b>

                        <div class="muted">
                          ${
                            new Date(
                              o.created_at
                            ).toLocaleString()
                          }
                        </div>

                      </div>


                      <span class="status">
                        ${esc(o.order_status)}
                      </span>

                    </div>


                    ${
                      o.items
                        .map(
                          i => `
                            <div class="total-line">

                              <span>

                                ${esc(
                                  i.product_name
                                )}

                                ·

                                ${esc(
                                  i.variant
                                )}

                                ×
                                ${i.quantity}

                              </span>

                              <b>
                                ${money(
                                  i.subtotal
                                )}
                              </b>

                            </div>
                          `
                        )
                        .join('')
                    }


                    <div class="total-line">

                      <span>
                        Payment:
                        ${esc(
                          o.payment_method
                        )}
                      </span>

                      <b>
                        ${money(o.total)}
                      </b>

                    </div>


                    <div class="muted">

                      Deliver to:
                      ${esc(o.address)}

                    </div>

                  </div>
                `
              )
              .join('')

          : `
              <div class="panel">

                No orders yet.

                <a href="#shop">
                  <u>
                    Start shopping
                  </u>
                </a>

              </div>
            `
      }

    </section>
  `;


  document.querySelector(
    '#logout'
  ).onclick = async () => {

    await api(
      '/api/auth/logout',
      {
        method: 'POST'
      }
    );

    me = null;

    location.hash = '#home';
  };
}


/* =========================
   ADMIN REDIRECT
========================= */

async function adminRedirect() {

  if (!me) {

    location.hash = '#login';

    return;
  }


  if (me.role !== 'admin') {

    toast(
      'Admin access required'
    );

    location.hash = '#home';

    return;
  }


  location.href =
    '/admin.html';
}


/* =========================
   START APPLICATION
========================= */

init();
