'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import { Share2, Download, Copy, Check } from 'lucide-react'
import { showToast } from '@/lib/toast-helpers'

interface QRShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  url: string
  description?: string
}

export function QRShareModal({ isOpen, onClose, title, url, description }: QRShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      showToast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      showToast.error('Failed to copy link')
    }
  }

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-qr.png`
          a.click()
          URL.revokeObjectURL(url)
          showToast.success('QR code downloaded!')
        }
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        })
        showToast.success('Shared successfully!')
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          showToast.error('Failed to share')
        }
      }
    } else {
      handleCopy()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[3rem] border-2 border-slate-200 bg-white p-8">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-black uppercase italic">
            {title}
          </DialogTitle>
          {description && (
            <p className="text-center text-[11px] font-medium text-slate-500">
              {description}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* QR Code */}
          <div className="p-6 bg-white rounded-3xl border-4 border-slate-100 shadow-lg">
            <QRCodeSVG
              id="qr-code-svg"
              value={url}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          {/* URL Display */}
          <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-mono text-slate-600 break-all text-center">
              {url}
            </p>
          </div>

          {/* Actions */}
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="h-12 rounded-2xl font-black uppercase text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-12 rounded-2xl font-black uppercase text-xs"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <Button
            onClick={handleShare}
            className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary text-slate-950"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
