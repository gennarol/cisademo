const { app } = require('@azure/functions');
const { getTableClient, TABLES, entityToOrder, orderToEntity } = require('../services/tableService');

app.http('updateOrder', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}',
  handler: async (request, context) => {
    const orderId = request.params.orderId;

    try {
      const updates = await request.json();
      const ordersClient = getTableClient(TABLES.ORDERS);

      // Fetch existing order
      let entity;
      try {
        entity = await ordersClient.getEntity('ORDER', orderId);
      } catch (err) {
        if (err.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'Order not found' } };
        }
        throw err;
      }

      const order = entityToOrder(entity);

      // Apply updates
      const allowedFields = ['status', 'customer', 'customerStatus', 'customerSuggestions', 'warnings', 'totalAmount'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          order[field] = updates[field];
        }
      }

      // Save updated order
      const updatedEntity = orderToEntity(order);
      await ordersClient.updateEntity(updatedEntity, 'Replace');

      return {
        status: 200,
        jsonBody: { id: orderId, message: 'Order updated successfully' },
      };
    } catch (error) {
      context.error('Error updating order:', error);
      return { status: 500, jsonBody: { error: 'Failed to update order' } };
    }
  }
});
