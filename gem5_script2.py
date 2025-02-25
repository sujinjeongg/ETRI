import m5
from m5.objects import *

root = Root(full_system=False)  # SE 모드 사용

sys = System()
sys.clk_domain = SrcClockDomain(clock="1GHz", voltage_domain=VoltageDomain())
sys.mem_mode = "atomic"
sys.mem_ranges = [AddrRange("64MB")] 

sys.membus = SystemXBar()

sys.cpu = X86AtomicSimpleCPU()
sys.cpu.createThreads()

sys.cpu.createInterruptController()
sys.cpu.interrupts[0].pio = sys.membus.mem_side_ports
sys.cpu.interrupts[0].int_requestor = sys.membus.cpu_side_ports

sys.mem_ctrl = MemCtrl()
sys.mem_ctrl.dram = DDR3_1600_8x8(range=sys.mem_ranges[0])
sys.mem_ctrl.port = sys.membus.mem_side_ports

sys.cpu.icache_port = sys.membus.cpu_side_ports
sys.cpu.dcache_port = sys.membus.cpu_side_ports

sys.workload = X86EmuLinux()

process = Process()
process.cmd = ["/UHome/etri33301/SoCExtension/gem5/configs/matrix-multiply"] 
#process.cmd = ["/UHome/etri33294/Next_Generation_Memory_Platform/gem5/tests/test-progs/hello/bin/x86/linux/hello32"]

sys.cpu.workload = process

sys.system_port = sys.membus.cpu_side_ports

root.system = sys
for obj in root.descendants():
    print(obj)

m5.instantiate()

print("gem5 Simulation 시작!")
exit_event = m5.simulate()
print(f"💡 Exiting @ tick {m5.curTick()} because {exit_event.getCause()}")
