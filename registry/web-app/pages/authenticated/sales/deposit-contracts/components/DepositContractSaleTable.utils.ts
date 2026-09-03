type CommissionCalculationParams = {
  watchedSales?: Array<{
    percentage?: number | string | null
    amt_commission?: number | string | null
    pct_commission?: number | string | null
  }> | null
  paymentAmount?: number | null
  feeCalculationPrice?: number | null
  pctRevenue?: number | string | null
  amtRevenue?: number | string | null
  revenueType?: 'pct' | 'amt' | string | null
  isAmtCommission: boolean
}

export const calculateDepositCommissionTotal = ({
  watchedSales,
  paymentAmount,
  feeCalculationPrice,
  pctRevenue,
  amtRevenue,
  revenueType,
  isAmtCommission,
}: CommissionCalculationParams) => {
  const feeCalculationPriceValid = feeCalculationPrice
    ? Number(feeCalculationPrice)
    : Number(paymentAmount || 0)

  const baseAmount = (() => {
    if (revenueType === 'amt') return amtRevenue ? Number(amtRevenue) : 0
    const pctRevFraction =
      pctRevenue !== undefined && pctRevenue !== null ? Number(pctRevenue) / 100 : 1
    return feeCalculationPriceValid * pctRevFraction
  })()

  let sumDTBDS = 0
  let sumDTCaNhan = 0

  watchedSales?.forEach((item) => {
    const pct = Number(item.percentage || 0) / 100
    const commValue = isAmtCommission
      ? Number(item.amt_commission || 0)
      : Number(item.pct_commission || 0)

    const bds = baseAmount * pct
    const cnhan = isAmtCommission
      ? commValue * pct
      : feeCalculationPriceValid * pct * (commValue / 100)

    sumDTBDS += bds
    sumDTCaNhan += cnhan
  })

  return { totalDTBDS: sumDTBDS, totalDTCaNhan: sumDTCaNhan }
}
