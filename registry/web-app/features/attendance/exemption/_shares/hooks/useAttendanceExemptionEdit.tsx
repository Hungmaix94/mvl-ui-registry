export const useAttendanceExemptionEdit = () => {
  // const ref = useRef<AttendanceExemptionFormRef>(null)
  // const { displayFormContent, displayClose, setLoading } = useDialog()
  // const updateMutation = usePartialUpdateAttendanceExemption()
  // const queryClient = useQueryClient()
  //
  // useEffect(() => {
  //   setLoading(updateMutation.isPending)
  // }, [updateMutation.isPending, setLoading])
  //
  // const openEditDialog = useCallback(
  //   (exemption: AttendanceExemption) => {
  //     displayFormContent({
  //       title: 'Chỉnh sửa nhân viên miễn chấm công',
  //       content: (
  //         <AttendanceExemptionForm
  //           ref={ref}
  //           initialData={exemption}
  //           onSubmit={async (data) => {
  //             try {
  //               const requestData = {
  //                 employee_id: data.employee_id,
  //                 effective_date: data.effective_date ? formatDateToApi(data.effective_date) : null,
  //                 notes: data.notes || undefined,
  //               }
  //
  //               await updateMutation.mutateAsync({
  //                 id: exemption.id,
  //                 data: requestData,
  //               })
  //               toastService.success('Chỉnh sửa nhân viên miễn chấm công thành công')
  //               await queryClient.invalidateQueries({
  //                 queryKey: QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.ALL(),
  //               })
  //               displayClose()
  //             } catch (error) {
  //               handleApiError(error)
  //             }
  //           }}
  //         />
  //       ),
  //       cancelText: 'Huỷ',
  //       onCancel: () => {
  //         displayClose()
  //       },
  //       confirmText: 'Lưu',
  //       onConfirm: async () => {
  //         await ref.current?.handleFormSubmit()
  //       },
  //       footerFlexJustify: 'end',
  //     })
  //   },
  //   [displayFormContent, displayClose, updateMutation, queryClient]
  // )

  return {
    // openEditDialog,
    // isUpdating: updateMutation.isPending,
  }
}
