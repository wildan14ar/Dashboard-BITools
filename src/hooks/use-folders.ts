import { useQuery } from "@tanstack/react-query"
import axios from "axios"

export type Folder = {
  id: string
  name: string
  parentId: string | null
}

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data } = await axios.get<Folder[]>("/api/folders")
      return data
    },
    staleTime: 60_000,
  })
}
