# Order Tracking Dashboard

View order status, shipment details, and delivery milestones at a glance.

---

## Order Summary

```mdma
id: order-info
type: callout
variant: info
title: "Order #ORD-2024-78542"
content: >
  Placed on March 15, 2024. Estimated delivery: March 22, 2024.
  Current status: In Transit.
```

## Order Items

```mdma
id: order-items
type: table
sortable: true
columns:
  - key: item
    header: Item
    sortable: true
  - key: qty
    header: Qty
  - key: price
    header: Unit Price
    sortable: true
  - key: status
    header: Status
    sortable: true
data:
  - { item: "Wireless Keyboard", qty: 1, price: "$79.99", status: "Shipped" }
  - { item: "USB-C Hub", qty: 2, price: "$34.99", status: "Shipped" }
  - { item: "Monitor Stand", qty: 1, price: "$129.99", status: "Processing" }
  - { item: "Cable Management Kit", qty: 1, price: "$19.99", status: "Shipped" }
```

## Delivery Milestones

```mdma
id: delivery-milestones
type: tasklist
items:
  - id: order-placed
    text: Order placed and confirmed
    checked: true
  - id: payment-processed
    text: Payment processed
    checked: true
  - id: warehouse-picked
    text: Items picked and packed
    checked: true
  - id: shipped
    text: Shipped from warehouse
    checked: true
  - id: in-transit
    text: In transit to delivery address
    checked: true
  - id: out-for-delivery
    text: Out for delivery
  - id: delivered
    text: Delivered
```

## Shipping Cost Breakdown

```mdma
id: cost-chart
type: chart
variant: pie
label: Cost Breakdown
data: |
  Category, Amount
  Products, 299.95
  Shipping, 12.99
  Tax, 24.95
xAxis: Category
```

## Need Help?

```mdma
id: contact-support-btn
type: button
text: Contact Support
variant: secondary
onAction: contact-support
```

```mdma
id: report-issue-btn
type: button
text: Report a Problem
variant: danger
onAction: report-issue
confirm:
  title: Report an Issue
  message: This will open a support case for this order. Continue?
  confirmText: Report Issue
  cancelText: Cancel
```

---

For questions about your order, contact our support team or use the buttons above.
