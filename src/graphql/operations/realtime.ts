import { gql } from '@apollo/client';

export const GET_MY_REALTIME_ORDERS_AS_PROVIDER = gql`
  query GetMyRealtimeOrdersAsProvider {
    myRealtimeOrdersAsProvider {
      id
      status
      createdAt
      startedAt
      completedAt
      clientAddress
      clientDescription
      clientLat
      clientLng
      providerLat
      providerLng
      quotedPrice
      quotedHours
      quotedTransport
      counterOfferPrice
      counterOfferHours
      counterOfferTransport
      payment {
        amount
      }
      client {
        id
        displayName
      }
      serviceProvider {
        id
        price
        service {
          id
          name
        }
      }
    }
  }
`;

export const GET_MY_REALTIME_ORDERS_AS_CLIENT = gql`
  query GetMyRealtimeOrdersAsClient {
    myRealtimeOrdersAsClient {
      id
      status
      createdAt
      startedAt
      completedAt
      clientAddress
      clientDescription
      clientLat
      clientLng
      providerLat
      providerLng
      quotedPrice
      quotedHours
      quotedTransport
      counterOfferPrice
      counterOfferHours
      counterOfferTransport
      payment {
        amount
      }
      provider {
        id
        name
        logoImage {
          id
          cdnUrl
        }
        location
      }
      serviceProvider {
        id
        price
        service {
          id
          name
        }
      }
    }
  }
`;

export const GET_MY_REALTIME_STATE = gql`
  query GetMyRealtimeState {
    me {
      id
      provider {
        id
        isRealtimeActive
        activeRealtimeOrder {
          id
          status
          clientLat
          clientLng
          providerLat
          providerLng
          clientAddress
          quotedPrice
          quotedHours
          quotedTransport
          counterOfferPrice
          counterOfferHours
          counterOfferTransport
          startedAt
          completedAt
          client {
            id
            displayName
          }
          serviceProvider {
            id
            price
            service {
              id
              name
            }
          }
          payment {
            amount
          }
        }
      }
      activeRealtimeOrder {
        id
        status
        clientLat
        clientLng
        providerLat
        providerLng
        clientAddress
        quotedPrice
        quotedHours
        quotedTransport
        counterOfferPrice
        counterOfferHours
        counterOfferTransport
        startedAt
        completedAt
        clientDescription
        providerId
        provider {
          id
          name
          logoImage {
            id
            cdnUrl
          }
          reviews {
            id
            rating
          }
        }
        serviceProvider {
          id
          price
          service {
            id
            name
          }
        }
        payment {
          amount
        }
      }
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($orderRealtimeId: Int!) {
    messages(orderRealtimeId: $orderRealtimeId) {
      id
      message
      senderId
      createdAt
      sender {
        id
        displayName
      }
      image {
        id
        cdnUrl
      }
    }
  }
`;

export const SET_MY_REALTIME_AVAILABILITY = gql`
  mutation SetMyRealtimeAvailability($active: Boolean!, $lat: Float, $lng: Float) {
    setMyRealtimeAvailability(active: $active, lat: $lat, lng: $lng)
  }
`;

export const CREATE_REALTIME_CONTACT_REQUEST = gql`
  mutation CreateRealtimeContactRequest($input: CreateRealtimeOrderInput!) {
    createRealtimeContactRequest(input: $input) {
      id
      status
    }
  }
`;

export const QUOTE_REALTIME_ORDER = gql`
  mutation QuoteRealtimeOrder($orderRealtimeId: Int!, $quotedHours: Int!, $quotedTransport: Int!, $quotedPrice: Int!) {
    quoteRealtimeOrder(
      orderRealtimeId: $orderRealtimeId
      quotedHours: $quotedHours
      quotedTransport: $quotedTransport
      quotedPrice: $quotedPrice
    ) {
      id
      status
      quotedPrice
      quotedHours
      quotedTransport
    }
  }
`;

export const UPDATE_REALTIME_QUOTE = gql`
  mutation UpdateRealtimeQuote($orderRealtimeId: Int!, $quotedHours: Int!, $quotedTransport: Int!, $quotedPrice: Int!) {
    updateRealtimeQuote(orderRealtimeId: $orderRealtimeId, quotedHours: $quotedHours, quotedTransport: $quotedTransport, quotedPrice: $quotedPrice) {
      id
      quotedPrice
      quotedHours
      quotedTransport
    }
  }
`;

export const ACCEPT_REALTIME_ORDER_QUOTE = gql`
  mutation AcceptRealtimeOrderQuote($orderRealtimeId: Int!) {
    acceptRealtimeOrderQuote(orderRealtimeId: $orderRealtimeId) {
      id
      status
    }
  }
`;

export const REJECT_REALTIME_ORDER_QUOTE = gql`
  mutation RejectRealtimeOrderQuote($orderRealtimeId: Int!) {
    rejectRealtimeOrderQuote(orderRealtimeId: $orderRealtimeId) {
      id
      status
      respondedAt
    }
  }
`;

export const RESPOND_REALTIME_CONTACT_REQUEST = gql`
  mutation RespondRealtimeContactRequest($orderRealtimeId: Int!, $decision: String!) {
    respondRealtimeContactRequest(orderRealtimeId: $orderRealtimeId, decision: $decision) {
      id
      status
      respondedAt
    }
  }
`;

export const START_REALTIME_ORDER = gql`
  mutation StartRealtimeOrder($orderRealtimeId: Int!) {
    startRealtimeOrder(orderRealtimeId: $orderRealtimeId) {
      id
      status
      startedAt
    }
  }
`;

export const FINISH_REALTIME_ORDER = gql`
  mutation FinishRealtimeOrder($orderRealtimeId: Int!) {
    finishRealtimeOrder(orderRealtimeId: $orderRealtimeId) {
      id
      status
      completedAt
    }
  }
`;

export const CANCEL_REALTIME_ORDER = gql`
  mutation CancelRealtimeOrder($orderRealtimeId: Int!) {
    cancelRealtimeOrder(orderRealtimeId: $orderRealtimeId) {
      id
      status
      respondedAt
    }
  }
`;

export const UPDATE_REALTIME_ORDER_LOCATION = gql`
  mutation UpdateRealtimeOrderLocation($orderRealtimeId: Int!, $lat: Float!, $lng: Float!) {
    updateRealtimeOrderLocation(orderRealtimeId: $orderRealtimeId, lat: $lat, lng: $lng) {
      id
      clientLat
      clientLng
      providerLat
      providerLng
      updatedAt
    }
  }
`;

export const UPDATE_PROVIDER_LOCATION = gql`
  mutation UpdateProviderLocation($lat: Float!, $lng: Float!) {
    updateProviderLocation(lat: $lat, lng: $lng)
  }
`;

export const INIT_REALTIME_FLOW_PAYMENT = gql`
  mutation InitRealtimeFlowPayment($orderRealtimeId: Int!, $returnUrl: String!) {
    initRealtimeFlowPayment(orderRealtimeId: $orderRealtimeId, returnUrl: $returnUrl) {
      url
      token
      paymentExpiresAt
    }
  }
`;

export const CONFIRM_REALTIME_FLOW_PAYMENT = gql`
  mutation ConfirmRealtimeFlowPayment($token: String!) {
    confirmRealtimeFlowPayment(token: $token) {
      id
      status
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($orderRealtimeId: Int!, $message: String!) {
    sendMessage(orderRealtimeId: $orderRealtimeId, message: $message) {
      id
      message
      senderId
      createdAt
      sender {
        id
        displayName
      }
    }
  }
`;

export const CREATE_REALTIME_PROVIDER_REVIEW = gql`
  mutation CreateRealtimeProviderReview($input: CreateRealtimeProviderReviewInput!) {
    createRealtimeProviderReview(input: $input) {
      id
      rating
      comment
    }
  }
`;

export const CREATE_CLIENT_REVIEW = gql`
  mutation CreateClientReview($input: CreateClientReviewInput!) {
    createClientReview(input: $input) {
      id
      rating
      comment
    }
  }
`;

export const REQUEST_PROVIDER_TO_CONNECT = gql`
  mutation RequestProviderToConnect($serviceProviderId: Int!) {
    requestProviderToConnect(serviceProviderId: $serviceProviderId)
  }
`;

export const GUEST_CREATE_REALTIME_CONTACT_REQUEST = gql`
  mutation GuestCreateRealtimeContactRequest($input: GuestCreateRealtimeOrderInput!) {
    guestCreateRealtimeContactRequest(input: $input) {
      order { id status }
      accessToken
      user { id displayName email phone }
    }
  }
`;

export const CLIENT_COUNTER_OFFER = gql`
  mutation ClientCounterOfferRealtimeOrder($input: CounterOfferRealtimeOrderInput!) {
    clientCounterOfferRealtimeOrder(input: $input) {
      id
      status
      counterOfferPrice
      counterOfferHours
      counterOfferTransport
    }
  }
`;

export const RESPOND_TO_COUNTER_OFFER = gql`
  mutation RespondToCounterOffer($orderRealtimeId: Int!, $decision: String!) {
    respondToCounterOffer(orderRealtimeId: $orderRealtimeId, decision: $decision) {
      id
      status
      quotedPrice
      quotedHours
      quotedTransport
      counterOfferPrice
      counterOfferHours
      counterOfferTransport
    }
  }
`;
