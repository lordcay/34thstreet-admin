import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'
import { isCurrentUserAdmin } from 'src/utils/auth'

import logo from 'src/assets/brand/logo.png'
import sygnet from 'src/assets/brand/logo.png' // or another png if you have one


// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const isAdmin = isCurrentUserAdmin()

  const adminOnlyPaths = ['/users', '/reports', '/blocks', '/street-gist']
  const filteredNavigation = navigation.filter((item) => {
    if (!item?.to) return true
    if (isAdmin) return true
    return !adminOnlyPaths.includes(item.to)
  })

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/" className="d-flex align-items-center gap-2">
  <img src={logo} height={28} alt="34th Street" />
  <span className="fw-semibold">34th Street Admin</span>
</CSidebarBrand>

       {/* <CSidebarBrand to="/" className="d-flex align-items-center gap-2">
  <CIcon customClassName="sidebar-brand-full" icon={logo} height={28} />
  <span className="sidebar-brand-full fw-semibold">34th Street Admin</span>

  <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={28} />
  <span className="sidebar-brand-narrow fw-semibold">34th</span>
</CSidebarBrand> */}

        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
