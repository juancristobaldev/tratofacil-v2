import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      emailVerified
      displayName
      flowCustomerId
      role
      creditCardType
      last4CardDigits
      kycStatus
      phone
      birthday
      isProfileComplete
      isProfileFullyComplete
      isGuest
      username
      identitys {
        id
        status
      }
      planOrders {
        id
        plan
        planActive
        planEndsAt
        subscriptionFlowId
        interval
        status
        total
      }
      marketplacePlanOrders {
        id
        plan
        planActive
        planEndsAt
        subscriptionFlowId
        interval
        status
        total
      }
      provider {
        id
        name
        slug
        bio
        location
        lat
        lng
        rut
        logoImage { id cdnUrl }
        isRealtimeActive
        hasSchedule
        completedOrdersCount
        priority
        bank {
          id
          bankName
          accountType
          accountNumber
          rut
          email
        }
        services {
          id
          description
          price
          hasHomeVisit
          slug
          providerId
          serviceId
          service {
            id
            name
            slug
          }
        }
        realtimeReviews {
          id
          rating
          comment
          clientId
          createdAt
        }
      }
      wallet {
        id
        balance
        transactions {
          id
          type
          amount
          description
          createdAt
        }
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      user {
        id
        email
        role
        displayName
        username
        phone
        kycStatus
        emailVerified
        provider {
          id
          name
        }
      }
    }
  }
`;

export const LOGIN_WITH_GOOGLE_MUTATION = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      accessToken
      user {
        id
        email
        role
        displayName
        username
        phone
        kycStatus
        provider { id name }
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterUserInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        email
        role
        displayName
        username
        phone
      }
    }
  }
`;

export const CHECK_LOGIN_EMAIL_EXISTS = gql`
  query CheckLoginEmailExists($email: String!) {
    checkLoginEmailExists(email: $email) {
      exists
      hasPassword
    }
  }
`;

export const SEND_EMAIL_VERIFICATION_CODE = gql`
  mutation SendEmailVerificationCode($email: String!) {
    sendEmailVerificationCode(email: $email)
  }
`;

export const CONFIRM_EMAIL_AND_REGISTER = gql`
  mutation ConfirmEmailAndRegister($code: String!, $credentials: CredentialsInput!) {
    confirmEmailAndRegister(code: $code, credentials: $credentials)
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($newPassword: String!, $token: String!) {
    resetPassword(newPassword: $newPassword, token: $token)
  }
`;

export const SET_GUEST_PASSWORD = gql`
  mutation SetGuestPassword($newPassword: String!) {
    setGuestPassword(newPassword: $newPassword)
  }
`;
