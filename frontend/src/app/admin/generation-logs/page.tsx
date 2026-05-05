"use client";

import { useState, useEffect } from "react";
import { fetchAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, FileText, Image as ImageIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import Image from "next/image";

interface ApiKey {
  id: string;
  key: string;
}

interface GenerationTask {
  id: string;
  type: string;
  status: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  imageUrl: string;
  errorReason: string;
  providerName: string;
  createdAt: string;
  apiKey: ApiKey;
}

export default function GenerationLogs() {
  const [logs, setLogs] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialogs
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState("");

  const fetchLogs = async (pageNum = 1, searchQuery = search, status = statusFilter) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        search: searchQuery,
      });
      if (status !== "all") {
        queryParams.append("status", status);
      }
      
      const res = await fetchAdminApi(`/admin/generation-logs?${queryParams.toString()}`);
      setLogs(res.items);
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (error: any) {
      toast.error("获取生成日志失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs(1, search, statusFilter);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter]);

  const openImage = (url: string) => {
    if (!url) return;
    setCurrentImage(url);
    setIsImageOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{getStatusIcon(status)} 成功</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">{getStatusIcon(status)} 失败</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{getStatusIcon(status)} 生成中</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{getStatusIcon(status)} 等待中</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">调用记录 (日志)</h2>
      </div>

      <Card className="border-white/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              API 调用日志
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="w-[130px] bg-slate-50 border-slate-200">
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有状态</SelectItem>
                  <SelectItem value="success">生成成功</SelectItem>
                  <SelectItem value="failed">生成失败</SelectItem>
                  <SelectItem value="running">生成中</SelectItem>
                  <SelectItem value="pending">等待中</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="搜索提示词, ID 或 Key..."
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-slate-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium w-16">图片</th>
                  <th className="px-6 py-4 font-medium">任务 ID</th>
                  <th className="px-6 py-4 font-medium">调用 Key</th>
                  <th className="px-6 py-4 font-medium">提示词</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium">供应商</th>
                  <th className="px-6 py-4 font-medium">调用时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      未找到调用日志
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {log.imageUrl ? (
                          <div 
                            className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImage(log.imageUrl)}
                          >
                            <Image 
                              src={log.imageUrl} 
                              alt="Generated" 
                              width={40} 
                              height={40}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500" title={log.id}>
                        {log.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block" title={log.apiKey?.key}>
                          {log.apiKey ? `${log.apiKey.key.substring(0, 8)}...` : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[200px] sm:max-w-[300px] truncate text-slate-700" title={log.prompt}>
                          {log.prompt}
                        </div>
                        {log.errorReason && (
                          <div className="text-xs text-red-500 truncate max-w-[200px] sm:max-w-[300px] mt-1" title={log.errorReason}>
                            错误: {log.errorReason}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">
                          类型: {log.type} | 模型: {log.model}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                        {log.providerName || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <span className="text-sm text-slate-500">
                第 {page} 页，共 {totalPages} 页
              </span>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchLogs(page - 1)} 
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchLogs(page + 1)} 
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent className="sm:max-w-[600px] p-1 bg-white border-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>预览图片</DialogTitle>
          </DialogHeader>
          {currentImage && (
            <div className="relative w-full h-auto aspect-square bg-slate-100">
              <Image 
                src={currentImage} 
                alt="Preview" 
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
