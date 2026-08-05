import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_PRODUCT,
  GET_PRODUCT_BY_SLUG,
  GET_MARKETPLACE_DATA,
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  REMOVE_PRODUCT,
  CREATE_ORDER_PRODUCT_WITH_PAYMENT,
} from '../graphql/operations/products';
import {
  GET_MY_SALES,
  MY_ORDERS,
  UPDATE_ORDER_PRODUCT_SHIPPING,
  UPDATE_ORDER_PRODUCT_STATUS,
} from '../graphql/operations/orders';
import type {
  Product,
  CategoryProduct,
  OrderProduct,
  Order,
  OrderJob,
} from '../types/graphql';

interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  location?: string;
  slug: string;
  categoryProductId: number;
}

interface UpdateProductInput {
  id: number;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  location?: string;
  slug?: string;
}

interface CreateOrderInput {
  productId: number;
  quantity: number;
}

interface CreateShippingInput {
  street: string;
  number: string;
  commune: string;
  region: string;
  phone: string;
  reference?: string;
  dept?: string;
}

interface UseMarketplaceReturn {
  products: Product[];
  productsLoading: boolean;
  productsError: any;
  productCategories: CategoryProduct[];
  categoriesLoading: boolean;
  parentCategories: CategoryProduct[];
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  selectedSubCategory: string | null;
  setSelectedSubCategory: (v: string | null) => void;
  currentSubCategories: CategoryProduct[];
  filteredProducts: Product[];
  refetchMarketplace: () => void;
  selectedProduct: Product | null;
  productLoading: boolean;
  productError: any;
  fetchProduct: (id: number) => void;
  fetchProductBySlug: (slug: string) => void;
  mySales: OrderProduct[];
  mySalesLoading: boolean;
  mySalesError: any;
  myOrders: { products: OrderProduct[]; services: Order[]; jobs: OrderJob[] };
  myOrdersLoading: boolean;
  myOrdersError: any;
  createProduct: (input: CreateProductInput) => Promise<{ id: number; name: string; slug: string; price: number }>;
  createLoading: boolean;
  updateProduct: (input: UpdateProductInput) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
  createOrder: (input: CreateOrderInput, shipping: CreateShippingInput) => Promise<{ id: number; status: string; total: number }>;
  updateShipping: (input: { orderId: number; shippingCompany: string; trackingCode: string }) => Promise<void>;
  updateOrderStatus: (orderId: number, status: string) => Promise<void>;
  refetchSales: () => void;
  refetchOrders: () => void;
}

export function useMarketplace(): UseMarketplaceReturn {
  const [productId, setProductId] = useState<number | null>(null);
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  const {
    data: mpData,
    loading: marketplaceLoading,
    error: marketplaceError,
    refetch: refetchMarketplace,
  } = useQuery<{ categoriesProducts: CategoryProduct[] }>(GET_MARKETPLACE_DATA, {
    fetchPolicy: 'network-only',
  });

  const categories: CategoryProduct[] = mpData?.categoriesProducts || [];

  const subCategoryIds = useMemo(
    () =>
      new Set(
        categories.flatMap((c) => (c.subCategories || []).map((sub) => sub.id)),
      ),
    [categories],
  );

  const parentCategories = useMemo(
    () => categories.filter((c) => !subCategoryIds.has(c.id)),
    [categories, subCategoryIds],
  );

  const allProducts = useMemo(
    () => categories.flatMap((c) => c.products || []),
    [categories],
  );

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === selectedCategory) || null,
    [categories, selectedCategory],
  );

  const currentSubCategories: CategoryProduct[] = activeCategory?.subCategories || [];

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (selectedCategory) {
      filtered = activeCategory?.products || [];
      if (selectedSubCategory) {
        filtered = filtered.filter(
          (p) => p.subCategorySlug === selectedSubCategory,
        );
      }
    }

    return filtered;
  }, [allProducts, selectedCategory, selectedSubCategory, activeCategory]);

  const { data: productData, loading: productLoading, error: productError } = useQuery<{ product: Product }>(GET_PRODUCT, {
    variables: { id: productId! },
    skip: !productId,
  });

  const { data: slugData } = useQuery<{ productBySlug: Product }>(GET_PRODUCT_BY_SLUG, {
    variables: { slug: productSlug || '' },
    skip: !productSlug,
  });

  const {
    data: salesData,
    loading: mySalesLoading,
    error: mySalesError,
    refetch: refetchSales,
  } = useQuery<{ getMySales: OrderProduct[] }>(GET_MY_SALES, { fetchPolicy: 'network-only' });

  const {
    data: ordersData,
    loading: myOrdersLoading,
    error: myOrdersError,
    refetch: refetchOrders,
  } = useQuery<{ myOrders: { products: OrderProduct[]; services: Order[]; jobs: OrderJob[] } }>(
    MY_ORDERS,
    { fetchPolicy: 'network-only' },
  );

  const [createProdMut, { loading: createLoading }] = useMutation<{
    createProduct: { id: number; name: string; slug: string; price: number };
  }>(CREATE_PRODUCT);

  const [updateProdMut] = useMutation(UPDATE_PRODUCT);
  const [removeProdMut] = useMutation(REMOVE_PRODUCT);

  const [createOrderMut] = useMutation<{
    createOrderProductWithPayment: { id: number; status: string; total: number };
  }>(CREATE_ORDER_PRODUCT_WITH_PAYMENT);

  const [updateShippingMut] = useMutation(UPDATE_ORDER_PRODUCT_SHIPPING);
  const [updateStatusMut] = useMutation(UPDATE_ORDER_PRODUCT_STATUS);

  const createProduct = async (input: CreateProductInput) => {
    const { data: result } = await createProdMut({ variables: { input } });
    return result!.createProduct;
  };

  const updateProduct = async (input: UpdateProductInput) => {
    await updateProdMut({ variables: { input } });
  };

  const removeProduct = async (id: number) => {
    await removeProdMut({ variables: { id } });
  };

  const createOrder = async (input: CreateOrderInput, shipping: CreateShippingInput) => {
    const { data: result } = await createOrderMut({
      variables: { input, shippingInput: shipping },
    });
    return result!.createOrderProductWithPayment;
  };

  const updateShipping = async (input: { orderId: number; shippingCompany: string; trackingCode: string }) => {
    await updateShippingMut({ variables: { input } });
    refetchSales();
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    await updateStatusMut({ variables: { orderId, status } });
    refetchSales();
  };

  return {
    products: allProducts,
    productsLoading: marketplaceLoading,
    productsError: marketplaceError,
    productCategories: categories,
    categoriesLoading: marketplaceLoading,
    parentCategories,
    selectedCategory,
    setSelectedCategory: (v: string | null) => {
      setSelectedCategory(v);
      setSelectedSubCategory(null);
    },
    selectedSubCategory,
    setSelectedSubCategory,
    currentSubCategories,
    filteredProducts,
    refetchMarketplace,
    selectedProduct: productData?.product || slugData?.productBySlug || null,
    productLoading,
    productError,
    fetchProduct: setProductId,
    fetchProductBySlug: setProductSlug,
    mySales: salesData?.getMySales || [],
    mySalesLoading,
    mySalesError,
    myOrders: ordersData?.myOrders || { products: [], services: [], jobs: [] },
    myOrdersLoading,
    myOrdersError,
    createProduct,
    createLoading,
    updateProduct,
    removeProduct,
    createOrder,
    updateShipping,
    updateOrderStatus,
    refetchSales,
    refetchOrders,
  };
}
