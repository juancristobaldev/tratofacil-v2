import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      slug
      price
      stock
      description
      location
      shippingDisabled
      categoryProductId
      subCategorySlug
      images {
        id
        image {
          id
          cdnUrl
        }
      }
      user {
        id
        displayName
        provider {
          id
          name
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: Int!) {
    product(id: $id) {
      id
      name
      slug
      price
      stock
      description
      location
      shippingDisabled
      categoryProductId
      subCategorySlug
      categoryProduct {
        id
        name
        slug
        shippingDisabled
      }
      images {
        id
        image {
          id
          cdnUrl
        }
      }
      user {
        id
        displayName
        identitys {
          id
          status
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
        confirmationDeadline
      }
    }
  }
`;

export const GET_PRODUCT_BY_SLUG = gql`
  query GetProductBySlug($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      price
      stock
      description
      location
      shippingDisabled
      subCategorySlug
      categoryProduct {
        shippingDisabled
      }
      images {
        id
        image { id cdnUrl }
      }
      user {
        id
        displayName
        provider {
          id
          name
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
      }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
      price
      shippingDisabled
    }
  }`;

export const FIND_ALL_CATEGORIES = gql`
  query FindAllCategory {
    findAllCategory {
      id
      name
      parentId
      shippingDisabled
    }
  }
`;

export const PRODUCTS_COUNT_BY_USER = gql`
  query ProductsByUser($userId: Int!) {
    productsByUser(userId: $userId) {
      id
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      name
      price
      stock
    }
  }
`;

export const REMOVE_PRODUCT = gql`
  mutation RemoveProduct($id: Int!) {
    removeProduct(id: $id) {
      id
    }
  }
`;

export const GET_CATEGORIES_PRODUCTS = gql`
  query GetCategoriesProducts($city: String) {
    categoriesProducts(city: $city) {
      id
      name
      slug
      shippingDisabled
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

export const GET_MARKETPLACE_DATA = gql`
  query GetMarketplaceData($city: String) {
    categoriesProducts(city: $city) {
      id
      name
      slug
      subCategories {
        id
        name
        slug
      }
      products {
        id
        name
        slug
        price
        location
        stock
        description
        shippingDisabled
        categoryProductId
        subCategorySlug
        user {
          id
          displayName
          identitys {
            status
          }
        }
        images {
          id
          image { id cdnUrl }
        }
        deliveryCondition {
          id
          deliveryType
          shippingPayer
          maxDispatchDays
          confirmationDeadline
        }
      }
    }
  }
`;

export const CREATE_ORDER_PRODUCT_WITH_PAYMENT = gql`
  mutation CreateOrderProductWithPayment($input: CreateOrderProductInput!, $shippingInput: CreateShippingInfoInput!) {
    createOrderProductWithPayment(input: $input, shippingInput: $shippingInput) {
      id
      status
      total
    }
  }
`;

export const INIT_FLOW_PRODUCT = gql`
  mutation InitFlowProduct($orderProductId: Int!, $returnUrl: String!) {
    initFlowProduct(orderProductId: $orderProductId, returnUrl: $returnUrl) {
      url
      token
    }
  }
`;

export const CONFIRM_FLOW_PRODUCT = gql`
  mutation ConfirmFlowProduct($token: String!) {
    confirmFlowProduct(token: $token) {
      id
      status
    }
  }
`;

export const PAY_PRODUCT_WITH_SAVED_CARD = gql`
  mutation PayProductOrderWithSavedCard($orderProductId: Int!) {
    payProductOrderWithSavedCard(orderProductId: $orderProductId) {
      id
      status
      total
    }
  }
`;

export const CONFIRM_ORDER_PRODUCT_RECEIPT = gql`
  mutation ConfirmOrderProductReceipt($orderId: Int!) {
    confirmOrderProductReceipt(orderId: $orderId) {
      id
      status
    }
  }
`;

