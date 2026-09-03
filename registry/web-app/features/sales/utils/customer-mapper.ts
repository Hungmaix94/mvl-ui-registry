import { SharedCustomerData } from '../components/CustomerDetailCard'

/**
 * Maps Customer data from either a Contract Snapshot (e.g. BookingContract or DepositContract)
 * or a raw Customer API object into the SharedCustomerData format required by the CustomerDetailCard.
 */
export function mapContractCustomerData(contract: any, customerData?: any): SharedCustomerData {
  const snapshot = contract?.customer_detail || contract?.potential_customer_detail || {}

  return {
    id: snapshot.id || customerData?.id || contract?.customer,
    customer_type: contract?.cust_customer_type || snapshot.customer_type || customerData?.customer_type,
    code: snapshot.code || customerData?.code,
    name:
      contract?.cust_full_name ||
      contract?.cust_business_name ||
      snapshot.name ||
      snapshot.full_name ||
      snapshot.business_name ||
      customerData?.name ||
      customerData?.full_name ||
      customerData?.business_name,
    identify_number:
      contract?.cust_id_number ||
      contract?.cust_business_tax_code ||
      snapshot.identify_number ||
      snapshot.id_number ||
      snapshot.business_tax_code ||
      customerData?.identify_number ||
      customerData?.id_number ||
      customerData?.business_tax_code,
    phone: contract?.cust_phone || snapshot.phone || customerData?.phone,
    email: contract?.cust_email || snapshot.email || customerData?.email,
  }
}
