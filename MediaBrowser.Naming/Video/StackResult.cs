﻿using System.Collections.Generic;

namespace MediaBrowser.Naming.Video
{
    public class StackResult
    {
        public List<FileStack> Stacks { get; set; }

        public StackResult()
        {
            Stacks = new List<FileStack>();
        }
    }
}
